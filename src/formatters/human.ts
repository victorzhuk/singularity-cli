import type { ExecutionContext } from '../core/context.js';

export function colorize(text: string, code: string, enabled: boolean): string {
  if (!enabled) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

export function outputTable(ctx: ExecutionContext, headers: string[], rows: string[][]): void {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)),
  );
  const fmt = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join('  ');
  const sep = widths.map((w) => '-'.repeat(w)).join('  ');
  const bold = (s: string) => colorize(s, '1', ctx.color);
  process.stdout.write(bold(fmt(headers)) + '\n');
  process.stdout.write(sep + '\n');
  for (const row of rows) {
    process.stdout.write(fmt(row) + '\n');
  }
}

export function outputSummary(_ctx: ExecutionContext, message: string): void {
  process.stdout.write(message + '\n');
}

export function warnStderr(message: string): void {
  process.stderr.write(message + '\n');
}
