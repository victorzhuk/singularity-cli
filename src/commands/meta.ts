import { Command } from 'commander';
import { contextFromCommand } from '../core/context.js';
import { cliVersion } from '../core/pkg.js';
import { output, outputSummary } from '../formatters/index.js';
import type { CommandMeta } from '../schemas/index.js';
import { allSchemas } from '../schemas/index.js';
import { readLockfile } from '../upstream/lockfile.js';
import { commandMetadata } from './registry.js';

export const metaMetadata: CommandMeta[] = [
  {
    name: 'commands',
    description: 'list all available commands and their metadata',
    args: [],
    examples: ['singularity commands --json'],
    outputSchema: 'CommandMetadata',
    errorCodes: [],
  },
  {
    name: 'schemas',
    description: 'print JSON Schema definitions for all output types',
    args: [],
    examples: ['singularity schemas --json'],
    outputSchema: null,
    errorCodes: [],
  },
  {
    name: 'version',
    description: 'print CLI and upstream MCPB version information',
    args: [],
    examples: ['singularity version --json'],
    outputSchema: 'VersionInfo',
    errorCodes: [],
  },
];

export function createMetaCommand(): Command[] {
  const versionCmd = new Command('version')
    .description('print CLI and upstream MCPB version information')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(versionCmd);
      let mcpbVersion = '';
      let mcpbSha256 = '';
      let packageSourceUrl = '';
      try {
        const lock = await readLockfile();
        mcpbVersion = lock.version;
        mcpbSha256 = lock.sha256;
        packageSourceUrl = lock.sourceUrl;
      } catch {
        // lockfile unreadable — degrade gracefully, still exit 0
      }
      const info = {
        cliVersion: cliVersion(),
        mcpbSha256,
        mcpbVersion,
        nodeVersion: process.version,
        packageSourceUrl,
        platform: process.platform,
      };
      output(ctx, info, () => {
        outputSummary(ctx, `cli: ${info.cliVersion}, mcpb: ${info.mcpbVersion || 'unknown'}`);
      });
    });

  const commandsCmd = new Command('commands')
    .description('list all available commands and their metadata')
    .option('--json', 'output JSON')
    .action(() => {
      const ctx = contextFromCommand(commandsCmd);
      const sorted = [...commandMetadata].sort((a, b) => a.name.localeCompare(b.name));
      output(ctx, { commands: sorted }, () => {
        for (const meta of sorted) {
          outputSummary(ctx, `${meta.name}: ${meta.description}`);
        }
      });
    });

  const schemasCmd = new Command('schemas')
    .description('print JSON Schema definitions for all output types')
    .option('--json', 'output JSON')
    .action(() => {
      const ctx = contextFromCommand(schemasCmd);
      const schemas = allSchemas();
      output(ctx, schemas, () => {
        for (const name of Object.keys(schemas)) {
          outputSummary(ctx, name);
        }
      });
    });

  return [versionCmd, commandsCmd, schemasCmd];
}
