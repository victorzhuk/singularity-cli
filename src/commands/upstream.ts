import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import {
  UpstreamBreakingChangeError,
  UpstreamSchemaMismatchError,
} from '../core/errors.js';
import { extractArchive } from '../upstream/extract.js';
import { sha256File } from '../upstream/hash.js';
import { readLockfile } from '../upstream/lockfile.js';
import { archivePath } from '../upstream/paths.js';
import { discoverUpstream } from '../upstream/discovery.js';

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}

function buildSortedModules(
  modules: Record<string, { functions: string[] }>,
): Record<string, { functions: string[] }> {
  const sorted: Record<string, { functions: string[] }> = {};
  for (const name of Object.keys(modules).sort((a, b) => a.localeCompare(b))) {
    sorted[name] = {
      functions: [...modules[name].functions].sort((a, b) =>
        a.localeCompare(b),
      ),
    };
  }
  return sorted;
}

export function createUpstreamCommand(): Command {
  const upstream = new Command('upstream').description(
    'manage the upstream Singularity MCPB bundle',
  );

  const verify = new Command('verify')
    .description('verify the bundled MCPB archive against the lockfile')
    .option('--json', 'output JSON')
    .action(async (options: { json?: boolean }) => {
      const lock = await readLockfile().catch(() => {
        throw new UpstreamSchemaMismatchError('upstream-lock.json missing');
      });

      const actualSha256 = await sha256File(archivePath);
      if (actualSha256 !== lock.sha256) {
        throw new UpstreamBreakingChangeError('sha256 mismatch', {
          expected: lock.sha256,
          actual: actualSha256,
        });
      }

      const tempDir = path.join(
        os.tmpdir(),
        `singularity-upstream-verify-${randomUUID()}`,
      );

      await extractArchive(archivePath, tempDir);
      const discovery = await discoverUpstream(tempDir, actualSha256);
      rmSync(tempDir, { recursive: true, force: true });

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
    .action(() => {
      console.log('not implemented in this change');
    });

  const upgrade = new Command('upgrade')
    .description('upgrade the upstream bundle')
    .action(() => {
      console.log('not implemented in this change');
    });

  upstream.addCommand(verify);
  upstream.addCommand(check);
  upstream.addCommand(upgrade);

  return upstream;
}
