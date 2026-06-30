import { readFileSync } from 'node:fs';
import path from 'node:path';

export function cliVersion(): string {
  try {
    const raw = readFileSync(
      path.join(__dirname, '..', '..', 'package.json'),
      'utf8',
    );
    return (JSON.parse(raw) as { version?: string }).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}
