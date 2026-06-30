import { mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import { UpstreamBreakingChangeError, UsageError } from '../core/errors.js';
import { sortKeys } from '../core/sortKeys.js';
import type { CommandMeta } from '../schemas/index.js';
import { extractArchive } from '../upstream/extract.js';
import { sha256File } from '../upstream/hash.js';
import { readLockfile } from '../upstream/lockfile.js';
import {
  archivePath as defaultArchivePath,
  lockfilePath as defaultLockfilePath,
} from '../upstream/paths.js';
import { verifyUpstreamRuntime } from '../upstream/runtime.js';
import {
  buildLock,
  downloadArchive,
  resolveTargetUrl,
  validateCandidate,
} from '../upstream/upgrade.js';

export const upstreamMetadata: CommandMeta[] = [
  {
    name: 'upstream check',
    description: 'check for upstream updates',
    args: [],
    examples: ['singularity upstream check --json'],
    outputSchema: null,
    errorCodes: ['UPSTREAM_SCHEMA_MISMATCH'],
  },
  {
    name: 'upstream upgrade',
    description: 'upgrade the upstream bundle',
    args: [],
    examples: ['singularity upstream upgrade --to 2.2.0'],
    outputSchema: null,
    errorCodes: ['UPSTREAM_BREAKING_CHANGE', 'UPSTREAM_SCHEMA_MISMATCH', 'USAGE_ERROR'],
  },
  {
    name: 'upstream verify',
    description: 'verify the bundled MCPB archive against the lockfile',
    args: [],
    examples: ['singularity upstream verify --json'],
    outputSchema: null,
    errorCodes: ['UPSTREAM_SCHEMA_MISMATCH', 'ADAPTER_UNAVAILABLE'],
  },
];

function buildSortedModules(
  modules: Record<string, { functions: string[] }>,
): Record<string, { functions: string[] }> {
  const sorted: Record<string, { functions: string[] }> = {};
  for (const name of Object.keys(modules).sort((a, b) => a.localeCompare(b))) {
    sorted[name] = { functions: [...modules[name].functions] };
  }
  return sorted;
}

function versionFromTarget(to: string, resolvedUrl: string): string {
  if (!to.startsWith('http://') && !to.startsWith('https://')) {
    return to;
  }
  const m = resolvedUrl.match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : to;
}

export function createUpstreamCommand(): Command {
  const upstream = new Command('upstream').description(
    'manage the upstream Singularity MCPB bundle',
  );

  const verify = new Command('verify')
    .description('verify the bundled MCPB archive against the lockfile')
    .option('--json', 'output JSON')
    .action(async (options: { json?: boolean }) => {
      const { discovery } = await verifyUpstreamRuntime({
        lockfilePath: process.env['SINGULARITY_UPSTREAM_LOCKFILE'],
        archivePath: process.env['SINGULARITY_UPSTREAM_ARCHIVE'],
      });

      if (options.json) {
        const output = {
          version: discovery.version,
          sha256: discovery.sha256,
          status: 'ok',
          discovered: {
            client: discovery.client.functions,
            modules: buildSortedModules(discovery.modules),
          },
        };
        console.log(JSON.stringify(sortKeys(output), null, 2));
      } else {
        console.log(`upstream ${discovery.version} verified`);
      }
    });

  const check = new Command('check')
    .description('check for upstream updates')
    .option('--json', 'output JSON')
    .action(async (options: { json?: boolean }) => {
      const lockPath =
        process.env['SINGULARITY_UPSTREAM_LOCKFILE'] ?? defaultLockfilePath;
      const lock = await readLockfile(lockPath);

      let updateAvailable = false;
      let candidateSha256: string | undefined;

      const tmpFile = path.join(
        tmpdir(),
        `singularity-check-${Date.now()}-${process.pid}.mcpb`,
      );
      try {
        await downloadArchive(lock.sourceUrl, tmpFile, 10_000);
        candidateSha256 = await sha256File(tmpFile);
        updateAvailable = candidateSha256 !== lock.sha256;
      } catch {
        process.stderr.write('upstream check: could not reach source URL\n');
      } finally {
        await rm(tmpFile, { force: true });
      }

      const result: Record<string, unknown> = {
        currentVersion: lock.version,
        sourceUrl: lock.sourceUrl,
        sha256: lock.sha256,
        updateAvailable,
      };
      if (candidateSha256 !== undefined) {
        result['candidateSha256'] = candidateSha256;
      }

      if (options.json) {
        process.stdout.write(JSON.stringify(sortKeys(result), null, 2) + '\n');
      } else {
        process.stdout.write(`current: ${lock.version}\n`);
        process.stdout.write(`source: ${lock.sourceUrl}\n`);
        process.stdout.write(`update available: ${updateAvailable}\n`);
      }
    });

  const upgrade = new Command('upgrade')
    .description('upgrade the upstream bundle')
    .option('--to <version|url>', 'target version or URL')
    .option('--json', 'output JSON')
    .action(async (options: { to?: string; json?: boolean }) => {
      if (!options.to) {
        throw new UsageError('--to <version|url> is required');
      }

      const lockPath =
        process.env['SINGULARITY_UPSTREAM_LOCKFILE'] ?? defaultLockfilePath;
      const archPath =
        process.env['SINGULARITY_UPSTREAM_ARCHIVE'] ?? defaultArchivePath;
      const lock = await readLockfile(lockPath);

      const targetUrl = resolveTargetUrl(options.to, lock.sourceUrl);
      const newVersion = versionFromTarget(options.to, targetUrl);

      const archDir = path.dirname(archPath);
      const tmpArchive = path.join(
        archDir,
        `.singularity-upgrade-${Date.now()}-${process.pid}.tmp`,
      );
      let tempExtractDir: string | undefined;

      try {
        try {
          await downloadArchive(targetUrl, tmpArchive, 60_000);
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            throw new UpstreamBreakingChangeError(
              `download timed out after 60000ms`,
              { url: targetUrl },
            );
          }
          const msg = err instanceof Error ? err.message : String(err);
          throw new UpstreamBreakingChangeError(`download failed: ${msg}`, {
            url: targetUrl,
          });
        }

        const candidateSha = await sha256File(tmpArchive);

        tempExtractDir = await mkdtemp(
          path.join(tmpdir(), 'singularity-upgrade-'),
        );
        await extractArchive(tmpArchive, tempExtractDir);
        const discovery = await validateCandidate(
          tempExtractDir,
          candidateSha,
          newVersion,
        );

        const newLock = buildLock(
          newVersion,
          candidateSha,
          targetUrl,
          new Date().toISOString(),
          discovery,
        );

        await rename(tmpArchive, archPath);
        await writeFile(
          lockPath,
          JSON.stringify(sortKeys(newLock), null, 2) + '\n',
          'utf8',
        );

        const nextSteps = [
          'npm run upstream:verify',
          'npm run typecheck',
          'npm run lint',
          'npm test',
          'npm run test:adapter',
          'npm run test:snapshot',
        ];

        if (options.json) {
          process.stdout.write(
            JSON.stringify(
              sortKeys({ upgraded: true, version: newVersion, sha256: candidateSha, nextSteps }),
              null,
              2,
            ) + '\n',
          );
        } else {
          process.stdout.write(`upgraded to ${newVersion}\n`);
          process.stdout.write('next steps:\n');
          for (const step of nextSteps) {
            process.stdout.write(`  ${step}\n`);
          }
        }
      } catch (err) {
        await rm(tmpArchive, { force: true });
        if (tempExtractDir) {
          await rm(tempExtractDir, { recursive: true, force: true });
        }
        throw err;
      }

      if (tempExtractDir) {
        await rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});
      }
    });

  upstream.addCommand(verify);
  upstream.addCommand(check);
  upstream.addCommand(upgrade);

  return upstream;
}
