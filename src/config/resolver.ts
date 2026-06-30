import * as fs from 'node:fs';
import type { ExecutionContext } from '../core/context.js';
import type { ConfigV1, ProfileConfig } from '../schemas/config.js';
import {
  ProfileUnknownError,
  ProjectAliasUnknownError,
  ProjectBindingMissingError,
} from '../core/errors.js';
import { findRepoConfig, globalConfigPath } from './discovery.js';
import { loadConfig } from './parse.js';

export interface ResolvedConfigs {
  repo?: ConfigV1;
  global?: ConfigV1;
  repoPath?: string;
}

export function loadResolvedConfig(ctx: ExecutionContext): ResolvedConfigs {
  const repoPath = findRepoConfig(ctx);
  let repo: ConfigV1 | undefined;
  if (repoPath && fs.existsSync(repoPath)) {
    repo = loadConfig(repoPath);
  }

  const gPath = globalConfigPath();
  let global: ConfigV1 | undefined;
  if (fs.existsSync(gPath)) {
    global = loadConfig(gPath);
  }

  return { repo, global, repoPath };
}

export function resolveProfile(
  ctx: ExecutionContext,
  cfg: ResolvedConfigs,
): { name: string; profile: ProfileConfig } {
  const name =
    ctx.profile ??
    cfg.repo?.defaultProfile ??
    cfg.global?.defaultProfile ??
    'default';

  const allProfiles = {
    ...(cfg.global?.profiles ?? {}),
    ...(cfg.repo?.profiles ?? {}),
  };

  if (Object.keys(allProfiles).length === 0) {
    return { name, profile: {} as ProfileConfig };
  }

  const profile = allProfiles[name];
  if (!profile) {
    throw new ProfileUnknownError(`unknown profile: ${name}`, {
      knownProfiles: Object.keys(allProfiles),
    });
  }

  return { name, profile };
}

export function resolveProjectId(
  ctx: ExecutionContext,
  cfg: ResolvedConfigs,
  profile: ProfileConfig,
): string | undefined {
  const raw = ctx.project ?? profile.defaultProject ?? cfg.repo?.defaultProject;
  if (!raw) return undefined;

  const allProjects = {
    ...(cfg.global?.projects ?? {}),
    ...(cfg.repo?.projects ?? {}),
  };

  const alias = allProjects[raw];
  if (alias) return alias.id;

  if (raw.length > 0 && !/\s/.test(raw)) return raw;

  throw new ProjectAliasUnknownError(`unknown project alias: ${raw}`, {
    knownAliases: Object.keys(allProjects),
  });
}

export function requireProjectId(
  ctx: ExecutionContext,
  cfg: ResolvedConfigs,
  profile: ProfileConfig,
): string {
  const id = resolveProjectId(ctx, cfg, profile);
  if (!id) {
    throw new ProjectBindingMissingError(
      'no project configured; use --project or set defaultProject in config',
    );
  }
  return id;
}

export function resolveBaseTaskGroupId(
  cfg: ResolvedConfigs,
  alias: string,
  profile?: ProfileConfig,
): string | undefined {
  const allProjects = {
    ...(cfg.global?.projects ?? {}),
    ...(cfg.repo?.projects ?? {}),
  };

  return allProjects[alias]?.baseTaskGroupId ?? profile?.defaultBaseTaskGroupId;
}
