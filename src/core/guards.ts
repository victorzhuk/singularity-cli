import type { ExecutionContext } from './context.js';
import { ConfirmationRequiredError, UnsupportedDryRunError } from './errors.js';

export function requireConfirmation(
  ctx: ExecutionContext,
  opts: { yes?: boolean; force?: boolean },
): void {
  if (ctx.json) {
    if (opts.yes || opts.force) return;
    throw new ConfirmationRequiredError(
      'destructive operation requires --yes or --force in JSON mode',
      { flag: '--yes or --force' },
    );
  }
  if (opts.yes) return;
  throw new ConfirmationRequiredError(
    'destructive operation requires --yes',
    { flag: '--yes' },
  );
}

export function assertDryRunSupported(supported: boolean): void {
  if (!supported) {
    throw new UnsupportedDryRunError('--dry-run is not supported for this operation');
  }
}
