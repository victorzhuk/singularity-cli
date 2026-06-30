import type { Command } from 'commander';
import { ValidationFailedError } from './errors.js';

export interface ExecutionContext {
  cwd: string;
  configPath?: string;
  profile?: string;
  project?: string;
  json: boolean;
  token?: string;
  apiUrl?: string;
  timeoutMs: number;
  color: boolean;
  dryRun: boolean;
}

export function buildExecutionContext(opts: Record<string, unknown>): ExecutionContext {
  let timeoutMs = 30000;
  if (opts.timeoutMs !== undefined) {
    const raw = Number(opts.timeoutMs);
    if (!Number.isFinite(raw) || raw <= 0 || raw > 600000) {
      throw new ValidationFailedError(
        '--timeout-ms must be a number between 1 and 600000',
        { field: 'timeoutMs' },
      );
    }
    timeoutMs = raw;
  }

  const color =
    opts.color !== false &&
    !process.env['NO_COLOR'] &&
    Boolean(process.stdout.isTTY);

  return {
    cwd: typeof opts.cwd === 'string' ? opts.cwd : process.cwd(),
    configPath: typeof opts.config === 'string' ? opts.config : undefined,
    profile: typeof opts.profile === 'string' ? opts.profile : undefined,
    project: typeof opts.project === 'string' ? opts.project : undefined,
    json: Boolean(opts.json),
    token: typeof opts.token === 'string' ? opts.token : undefined,
    apiUrl: typeof opts.apiUrl === 'string' ? opts.apiUrl : undefined,
    timeoutMs,
    color,
    dryRun: Boolean(opts.dryRun),
  };
}

export function contextFromCommand(cmd: Command): ExecutionContext {
  return buildExecutionContext(cmd.optsWithGlobals() as Record<string, unknown>);
}
