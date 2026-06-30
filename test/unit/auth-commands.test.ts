import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const repoRoot = process.cwd();
const cliBin = path.join(repoRoot, 'dist', 'cli.js');

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCli(
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<RunResult> {
  try {
    const { stdout, stderr } = await exec('node', [cliBin, ...args], {
      cwd: opts.cwd ?? repoRoot,
      env: opts.env ?? process.env,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', exitCode: e.code ?? 1 };
  }
}

function isolatedEnv(xdgBase: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  env['HOME'] = xdgBase;
  env['XDG_CONFIG_HOME'] = xdgBase;
  delete env['SINGULARITY_REFRESH_TOKEN'];
  delete env['REFRESH_TOKEN'];
  return env;
}

function secretsFilePath(xdgBase: string): string {
  return path.join(xdgBase, 'singularity-cli', 'secrets.json');
}

function seedSecrets(xdgBase: string, data: Record<string, string>): void {
  const p = secretsFilePath(xdgBase);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data), { mode: 0o600 });
}

describe('auth logout (CLI)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'sg-auth-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('no saved token → exit 0, hadSavedToken:false', async () => {
    const result = await runCli(
      ['auth', 'logout', '--json'],
      { env: isolatedEnv(tempDir) },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const out = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(out.loggedOut).toBe(true);
    expect(out.hadSavedToken).toBe(false);
    expect(out.profile).toBe('default');
  });

  it('no saved token → config file untouched', async () => {
    const cfgPath = path.join(tempDir, '.singularity-project.yml');
    const cfgContent = 'version: 1\nprofiles: {}\nprojects: {}\n';
    writeFileSync(cfgPath, cfgContent, 'utf8');

    await runCli(
      ['auth', 'logout', '--json', '--cwd', tempDir],
      { env: isolatedEnv(tempDir) },
    );

    expect(readFileSync(cfgPath, 'utf8')).toBe(cfgContent);
  });

  it('saved token → hadSavedToken:true, entry removed from secrets', async () => {
    const fakeToken = 'super-secret-xyz-tok-9x7z';
    seedSecrets(tempDir, { default: fakeToken });

    const result = await runCli(
      ['auth', 'logout', '--json'],
      { env: isolatedEnv(tempDir) },
    );

    expect(result.exitCode).toBe(0);
    const out = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(out.loggedOut).toBe(true);
    expect(out.hadSavedToken).toBe(true);

    const secretsPath = secretsFilePath(tempDir);
    const stored = existsSync(secretsPath)
      ? (JSON.parse(readFileSync(secretsPath, 'utf8')) as Record<string, unknown>)
      : {};
    expect(stored['default']).toBeUndefined();
  });

  it('token value never appears in stdout or stderr', async () => {
    const fakeToken = 'super-secret-should-not-appear-abc123';
    seedSecrets(tempDir, { default: fakeToken });

    const result = await runCli(
      ['auth', 'logout', '--json'],
      { env: isolatedEnv(tempDir) },
    );

    expect(result.stdout).not.toContain(fakeToken);
    expect(result.stderr).not.toContain(fakeToken);
  });

  it('second logout after first → still exit 0, hadSavedToken:false', async () => {
    seedSecrets(tempDir, { default: 'tok' });

    await runCli(['auth', 'logout', '--json'], { env: isolatedEnv(tempDir) });
    const result = await runCli(['auth', 'logout', '--json'], { env: isolatedEnv(tempDir) });

    expect(result.exitCode).toBe(0);
    const out = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(out.hadSavedToken).toBe(false);
  });
});

describe('auth status (CLI)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'sg-auth-status-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('--json with no token → AUTH_TOKEN_MISSING, stdout empty', async () => {
    const result = await runCli(
      ['auth', 'status', '--json'],
      { env: isolatedEnv(tempDir) },
    );

    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    const envelope = JSON.parse(result.stderr.trim()) as { error: { code: string } };
    expect(envelope.error.code).toBe('AUTH_TOKEN_MISSING');
  });
});
