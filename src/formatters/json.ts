import { CliError, formatErrorEnvelope } from '../core/errors.js';
import { redact } from '../core/redact.js';
import { sortKeys } from '../core/sortKeys.js';

export function outputJson(value: unknown): void {
  process.stdout.write(JSON.stringify(sortKeys(value), null, 2) + '\n');
}

export function outputJsonError(error: CliError): void {
  const envelope = redact(formatErrorEnvelope(error));
  process.stderr.write(JSON.stringify(envelope, null, 2) + '\n');
}
