import { Command } from 'commander';
import { NotImplementedError } from '../core/errors.js';
import { sortKeys } from '../core/sortKeys.js';
import { verifyUpstreamRuntime } from '../upstream/runtime.js';

function buildSortedModules(
  modules: Record<string, { functions: string[] }>,
): Record<string, { functions: string[] }> {
  const sorted: Record<string, { functions: string[] }> = {};
  for (const name of Object.keys(modules).sort((a, b) => a.localeCompare(b))) {
    sorted[name] = { functions: [...modules[name].functions] };
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
      const { discovery } = await verifyUpstreamRuntime({
        lockfilePath: process.env.SINGULARITY_UPSTREAM_LOCKFILE,
        archivePath: process.env.SINGULARITY_UPSTREAM_ARCHIVE,
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
    .action(() => {
      throw new NotImplementedError('upstream check');
    });

  const upgrade = new Command('upgrade')
    .description('upgrade the upstream bundle')
    .action(() => {
      throw new NotImplementedError('upstream upgrade');
    });

  upstream.addCommand(verify);
  upstream.addCommand(check, { hidden: true });
  upstream.addCommand(upgrade, { hidden: true });

  return upstream;
}
