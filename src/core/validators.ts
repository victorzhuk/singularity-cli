import { DeltaInvalidError, ValidationFailedError } from './errors.js';

export function validateApiUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationFailedError(`invalid API URL: ${url}`, { field: 'apiUrl' });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationFailedError(
      `API URL must use http or https: ${url}`,
      { field: 'apiUrl' },
    );
  }
}

export function validateEmoji(raw: string): string {
  if (/^[Uu]\+/.test(raw)) {
    throw new ValidationFailedError(
      'emoji must be the literal character, not U+ notation',
      { field: 'emoji' },
    );
  }
  const cp = raw.codePointAt(0);
  if (cp === undefined) {
    throw new ValidationFailedError('emoji must be a non-empty character', { field: 'emoji' });
  }
  return cp.toString(16).toLowerCase();
}

export function buildNotifyMinutes(input: string): number[] {
  if (!input.trim()) return [];
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
  const nums = parts.map((s) => {
    const n = Number(s);
    if (!Number.isInteger(n) || n <= 0) {
      throw new ValidationFailedError(`invalid notify-minutes value: ${s}`, {
        field: 'notifyMinutes',
      });
    }
    return n;
  });
  return [...new Set(nums)].sort((a, b) => b - a);
}

export function validateDelta(ops: unknown): void {
  if (
    ops !== null &&
    typeof ops === 'object' &&
    !Array.isArray(ops) &&
    'ops' in ops
  ) {
    throw new DeltaInvalidError(
      'delta must be a bare ops array, not {ops: [...]}',
    );
  }
  if (!Array.isArray(ops) || ops.length === 0) {
    throw new DeltaInvalidError('delta must be a non-empty array of operations');
  }
  const last = ops[ops.length - 1] as Record<string, unknown> | undefined;
  if (
    !last ||
    typeof last !== 'object' ||
    typeof last['insert'] !== 'string' ||
    !last['insert'].endsWith('\n')
  ) {
    throw new DeltaInvalidError('final delta op must be an insert ending with \\n');
  }
}
