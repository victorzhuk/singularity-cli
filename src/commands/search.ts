import { Command } from 'commander';
import { AdapterUnavailableError } from '../core/errors.js';
import type { CommandMeta } from '../schemas/index.js';

export function performSearch(query: string): never {
  void query;
  throw new AdapterUnavailableError(
    'search is not exposed by the current upstream',
    { method: 'search' },
  );
}

export const searchMetadata: CommandMeta[] = [
  {
    name: 'search',
    description: 'search across tasks and projects (not yet available in current upstream)',
    args: [],
    examples: ['singularity search --query "my task" --json'],
    outputSchema: null,
    errorCodes: ['ADAPTER_UNAVAILABLE'],
  },
];

export function createSearchCommand(): Command {
  const cmd = new Command('search')
    .description('search across tasks and projects (not yet available in current upstream)')
    .requiredOption('--query <q>', 'search query')
    .option('--json', 'output JSON')
    .action(() => {
      const { query } = cmd.opts() as { query: string };
      performSearch(query);
    });
  return cmd;
}
