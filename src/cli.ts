#!/usr/bin/env node

import { Command, CommanderError, program } from 'commander';
import { CliError, formatErrorEnvelope } from './core/errors.js';
import { redact } from './core/redact.js';
import { createUpstreamCommand } from './commands/upstream.js';

program
  .name('singularity')
  .description('CLI for the Singularity API')
  .option('--json', 'output JSON')
  .addCommand(createUpstreamCommand());

program.hook('preAction', (programCmd, actionCmd) => {
  if (programCmd.opts().json && actionCmd.opts().json === undefined) {
    actionCmd.setOptionValue('json', true);
  }
});

applyExitOverride(program);

function applyExitOverride(cmd: Command): void {
  cmd.exitOverride();
  cmd.configureOutput({ outputError: () => {} });
  for (const sub of cmd.commands) applyExitOverride(sub);
}

function presentError(error: unknown): void {
  if (
    error instanceof CommanderError &&
    (error.exitCode === 0 ||
      error.code === 'commander.help' ||
      error.code === 'commander.helpDisplayed')
  ) {
    process.exit(0);
  }

  let cliError: CliError;
  if (error instanceof CliError) {
    cliError = error;
  } else if (error instanceof CommanderError) {
    cliError = new CliError('USAGE_ERROR', error.message.replace(/^error:\s*/, ''));
  } else {
    const message = error instanceof Error ? error.message : String(error);
    cliError = new CliError('INTERNAL_ERROR', message);
  }

  const json = Boolean(program.opts().json) || process.argv.includes('--json');
  if (json) {
    process.stderr.write(
      `${JSON.stringify(redact(formatErrorEnvelope(cliError)), null, 2)}\n`,
    );
  } else {
    process.stderr.write(`error: ${cliError.message}\n`);
  }
  process.exit(1);
}

async function main(): Promise<void> {
  if (process.argv.slice(2).length === 0) {
    program.outputHelp();
    return;
  }
  await program.parseAsync(process.argv);
}

main().catch(presentError);
