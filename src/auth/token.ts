import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { ExecutionContext } from '../core/context.js';
import type { ProfileConfig } from '../schemas/config.js';
import { AuthTokenMissingError } from '../core/errors.js';
import { registerSecret } from '../core/redact.js';

function secretsFilePath(): string {
  const xdg = process.env['XDG_CONFIG_HOME'];
  const base = xdg ?? path.join(os.homedir(), '.config');
  return path.join(base, 'singularity-cli', 'secrets.json');
}

function readSecrets(): Record<string, string> {
  try {
    const raw = fs.readFileSync(secretsFilePath(), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    return {};
  }
  return {};
}

function writeSecrets(store: Record<string, string>): void {
  const p = secretsFilePath();
  fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o700 });
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, p);
}

export function hasSavedToken(profileName: string): boolean {
  return Boolean(readSecrets()[profileName]);
}

export function saveToken(profileName: string, token: string): void {
  const store = readSecrets();
  store[profileName] = token;
  writeSecrets(store);
}

export function removeToken(profileName: string): void {
  const store = readSecrets();
  delete store[profileName];
  writeSecrets(store);
}

export async function resolveToken(
  ctx: ExecutionContext,
  profile?: ProfileConfig,
  profileName?: string,
): Promise<string> {
  const pName = profileName ?? 'default';

  const candidate =
    ctx.token ??
    (profile?.tokenEnv ? process.env[profile.tokenEnv] : undefined) ??
    process.env['SINGULARITY_REFRESH_TOKEN'] ??
    process.env['REFRESH_TOKEN'] ??
    readSecrets()[pName];

  if (candidate) {
    registerSecret(candidate);
    return candidate;
  }

  if (ctx.json) {
    throw new AuthTokenMissingError(
      'no token available; set SINGULARITY_REFRESH_TOKEN or use --token',
    );
  }

  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  let token: string;
  try {
    token = await rl.question('Singularity token: ');
  } finally {
    rl.close();
  }

  if (!token.trim()) {
    throw new AuthTokenMissingError('no token provided');
  }

  registerSecret(token);
  return token;
}
