import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import { stringify as yamlStringify } from 'yaml';
import { resolveToken } from '../auth/index.js';
import { loadResolvedConfig, resolveProfile } from '../config/index.js';
import { contextFromCommand } from '../core/context.js';
import { AuthTokenMissingError, ConfigInvalidError, ValidationFailedError } from '../core/errors.js';
import { output, outputSummary } from '../formatters/index.js';
import type { ConfigV1 } from '../schemas/config.js';
import type { CommandMeta } from '../schemas/index.js';

export function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  if (tz === 'UTC' || tz === 'GMT') return true;
  if (/^GMT[+-]\d{1,2}$/.test(tz)) return true;
  if (/^[A-Za-z_]+(?:\/[A-Za-z_]+)+$/.test(tz)) return true;
  return false;
}

export interface InitOpts {
  project: string;
  profile: string;
  tokenEnv: string;
  timezone: string;
  apiUrl?: string;
}

export function buildInitConfig(opts: InitOpts): ConfigV1 {
  return {
    version: 1,
    defaultProject: opts.project,
    profiles: {
      [opts.profile]: {
        tokenEnv: opts.tokenEnv,
        timezone: opts.timezone,
        ...(opts.apiUrl ? { apiUrl: opts.apiUrl } : {}),
      },
    },
    projects: {},
  };
}

export const configMetadata: CommandMeta[] = [
  {
    name: 'config validate',
    description: 'validate local config and report token availability',
    args: [],
    examples: ['singularity config validate --json'],
    outputSchema: null,
    errorCodes: ['CONFIG_INVALID', 'PROFILE_UNKNOWN'],
  },
];

export const initMetadata: CommandMeta[] = [
  {
    name: 'init',
    description: 'initialize a .singularity-project.yml in the current directory',
    args: [],
    examples: ['singularity init --json --project myproj'],
    outputSchema: null,
    errorCodes: ['VALIDATION_FAILED'],
  },
];

export function createInitCommand(): Command {
  const init = new Command('init')
    .description('initialize a .singularity-project.yml in the current directory')
    .option('--json', 'output JSON')
    .option('--profile <name>', 'profile name', 'default')
    .option('--token-env <VAR>', 'env var name holding the refresh token', 'SINGULARITY_REFRESH_TOKEN')
    .option('--timezone <tz>', 'timezone for the profile', 'GMT+0')
    .option('--api-url <url>', 'API base URL to record in the profile')
    .option('--force', 'overwrite existing config')
    .action(async () => {
      const ctx = contextFromCommand(init);
      const opts = init.opts() as {
        profile: string;
        tokenEnv: string;
        timezone: string;
        apiUrl?: string;
        force?: boolean;
      };

      // --project, --profile, --api-url are also global options so they arrive via ctx
      let project = ctx.project ?? '';
      const profileName = ctx.profile ?? opts.profile;
      const apiUrl = ctx.apiUrl ?? opts.apiUrl;

      if (!project.trim()) {
        if (ctx.json) {
          throw new ValidationFailedError('--project is required in JSON mode', { field: 'project' });
        }
        const { createInterface } = await import('node:readline/promises');
        const rl = createInterface({ input: process.stdin, output: process.stderr });
        try {
          project = await rl.question('Project id or alias: ');
        } finally {
          rl.close();
        }
        if (!project.trim()) {
          throw new ValidationFailedError('project is required', { field: 'project' });
        }
      }

      const destPath = path.join(ctx.cwd, '.singularity-project.yml');

      if (fs.existsSync(destPath) && !opts.force) {
        throw new ValidationFailedError('config already exists; use --force to overwrite', { path: destPath });
      }

      const cfg = buildInitConfig({
        project: project.trim(),
        profile: profileName,
        tokenEnv: opts.tokenEnv,
        timezone: opts.timezone,
        apiUrl,
      });

      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, yamlStringify(cfg), 'utf8');

      const result = {
        created: true,
        path: destPath,
        profile: profileName,
        project: project.trim(),
        version: 1,
      };

      output(ctx, result, () => {
        outputSummary(ctx, `created ${destPath}`);
      });
    });
  return init;
}

export function createConfigCommand(): Command {
  const config = new Command('config').description('manage local project config');

  const validate = new Command('validate')
    .description('validate local config and report token availability')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(validate);
      const cfg = loadResolvedConfig(ctx);

      const repo = cfg.repo;

      const mergedProfiles = {
        ...(cfg.global?.profiles ?? {}),
        ...(repo?.profiles ?? {}),
      };
      const mergedProjects = {
        ...(cfg.global?.projects ?? {}),
        ...(repo?.projects ?? {}),
      };

      const defaultProfile = repo?.defaultProfile ?? null;
      const defaultProject = repo?.defaultProject ?? null;

      if (defaultProfile && Object.keys(mergedProfiles).length > 0) {
        if (!mergedProfiles[defaultProfile]) {
          throw new ConfigInvalidError(
            `defaultProfile '${defaultProfile}' not found in profiles`,
            { path: cfg.repoPath },
          );
        }
      }

      if (defaultProject) {
        const inMap = Boolean(mergedProjects[defaultProject]);
        if (!inMap && /\s/.test(defaultProject)) {
          throw new ConfigInvalidError(
            `defaultProject '${defaultProject}' is not a known alias and contains whitespace`,
            { path: cfg.repoPath },
          );
        }
      }

      for (const [name, prof] of Object.entries(mergedProfiles)) {
        if (prof.timezone !== undefined && !isValidTimezone(prof.timezone)) {
          throw new ConfigInvalidError(
            `invalid timezone '${prof.timezone}' in profile '${name}'`,
            { path: cfg.repoPath },
          );
        }
      }

      const resolved = resolveProfile(ctx, cfg);
      let tokenAvailable = false;
      try {
        await resolveToken({ ...ctx, json: true }, resolved.profile, resolved.name);
        tokenAvailable = true;
      } catch (err) {
        if (err instanceof AuthTokenMissingError) {
          tokenAvailable = false;
        } else {
          throw err;
        }
      }

      const profiles = Object.keys(repo?.profiles ?? {}).sort();
      const projectAliases = Object.entries(repo?.projects ?? {})
        .map(([alias, v]) => ({ alias, id: v.id }))
        .sort((a, b) => a.alias.localeCompare(b.alias));

      const report = {
        configPath: cfg.repoPath ?? null,
        defaultProfile,
        defaultProject,
        profiles,
        projectAliases,
        tokenAvailable,
        valid: true,
      };

      output(ctx, report, () => {
        outputSummary(ctx, `valid: ${report.valid}`);
        outputSummary(ctx, `configPath: ${report.configPath ?? '(none)'}`);
        outputSummary(ctx, `profiles: ${profiles.join(', ') || '(none)'}`);
        outputSummary(ctx, `tokenAvailable: ${tokenAvailable}`);
      });
    });

  config.addCommand(validate);

  return config;
}
