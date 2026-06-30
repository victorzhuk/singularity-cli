#!/usr/bin/env node

import { Command, CommanderError, program } from 'commander';
import { CliError, InternalError, UsageError } from './core/errors.js';
import { commandRegistry } from './commands/registry.js';
import { outputJsonError } from './formatters/json.js';
import { warnStderr } from './formatters/human.js';
import { cliVersion } from './core/pkg.js';

program
  .name('singularity')
  .description('CLI for the Singularity API')
  .option('--cwd <dir>', 'working directory')
  .option('--config <path>', 'config file path')
  .option('--profile <name>', 'config profile')
  .option('--project <id-or-alias>', 'project alias or id')
  .option('--json', 'output JSON')
  .option('--token <token>', 'API token override')
  .option('--api-url <url>', 'API URL override')
  .option('--timeout-ms <number>', 'request timeout in milliseconds')
  .option('--no-color', 'disable color output');

for (const f of commandRegistry) {
  const result = f();
  const cmds = Array.isArray(result) ? result : [result];
  for (const cmd of cmds) program.addCommand(cmd);
}

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
    cliError = new UsageError(error.message.replace(/^error:\s*/, ''));
  } else {
    const message = error instanceof Error ? error.message : String(error);
    cliError = new InternalError(message);
  }

  if (cliError.code === 'INTERNAL_ERROR') {
    cliError = new InternalError('an unexpected error occurred');
  }

  const json = Boolean(program.opts().json) || process.argv.includes('--json');
  if (json) {
    outputJsonError(cliError);
  } else {
    warnStderr(`error: ${cliError.message}`);
  }
  process.exit(1);
}

async function main(): Promise<void> {
  if (process.argv.slice(2).length === 0) {
    program.outputHelp();
    process.stdout.write(`\n  Version: ${cliVersion()}\n`);
    process.stdout.write('\n  Recommended next commands:\n');
    const recommended = [
      'init',
      'auth status',
      'config validate',
      'commands --json',
      'skills --agent claude',
    ];
    for (const cmd of recommended) {
      process.stdout.write(`    singularity ${cmd}\n`);
    }
    process.stdout.write('\n');
    process.exit(0);
  }
  await program.parseAsync(process.argv);
}

main().catch(presentError);
