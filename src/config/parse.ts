import * as fs from 'node:fs';
import { parse as yamlParse } from 'yaml';
import { ConfigV1Schema } from '../schemas/config.js';
import type { ConfigV1 } from '../schemas/config.js';
import { ConfigInvalidError } from '../core/errors.js';

export function parseConfig(raw: string, filePath?: string): ConfigV1 {
  let parsed: unknown;
  try {
    parsed = yamlParse(raw);
  } catch {
    throw new ConfigInvalidError(
      `invalid YAML${filePath ? ` in ${filePath}` : ''}`,
      { path: filePath },
    );
  }

  const result = ConfigV1Schema.safeParse(parsed);
  if (!result.success) {
    throw new ConfigInvalidError(
      `invalid config${filePath ? ` in ${filePath}` : ''}: ${result.error.message}`,
      { path: filePath },
    );
  }
  return result.data;
}

export function loadConfig(filePath: string): ConfigV1 {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    throw new ConfigInvalidError(`cannot read config: ${filePath}`, { path: filePath });
  }
  return parseConfig(raw, filePath);
}
