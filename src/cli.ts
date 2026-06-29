#!/usr/bin/env node

import { program } from 'commander';
import { CliError, formatErrorEnvelope } from './core/errors.js';
import { redact } from './core/redact.js';
import { createUpstreamCommand } from './commands/upstream.js';

const jsonMode = process.argv.includes('--json');

program
  .name('singularity')
  .description('CLI for the Singularity API')
  .addCommand(createUpstreamCommand());

async function main(): Promise<void> {
  await program.parseAsync(process.argv);
  if (process.argv.slice(2).length === 0) {
    program.help();
  }
}

main().catch((err: unknown) => {
  if (err instanceof CliError) {
    if (jsonMode) {
      process.stderr.write(
        `${JSON.stringify(redact(formatErrorEnvelope(err)), null, 2)}\n`,
      );
    } else {
      process.stderr.write(`error: ${err.message}\n`);
    }
  } else {
    const message = err instanceof Error ? err.message : String(err);
    if (jsonMode) {
      process.stderr.write(
        `${JSON.stringify(
          redact(formatErrorEnvelope(new CliError('ADAPTER_UNAVAILABLE', message))),
          null,
          2,
        )}\n`,
      );
    } else {
      process.stderr.write(`error: ${message}\n`);
    }
  }
  process.exit(1);
});
