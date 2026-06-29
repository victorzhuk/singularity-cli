import { execFile } from 'node:child_process';
import { cpSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const repoRoot = process.cwd();
const cliBin = path.join(repoRoot, 'dist', 'cli.js');
const distDir = path.join(repoRoot, 'dist');
const nodeModulesRoot = path.resolve(require.resolve('commander'), '..', '..');

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface RunOptions {
  bin?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

async function runCli(args: string[], options: RunOptions = {}): Promise<RunResult> {
  const bin = options.bin ?? cliBin;
  try {
    const { stdout, stderr } = await exec('node', [bin, ...args], {
      cwd: options.cwd ?? repoRoot,
      env: options.env,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    const result = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.code ?? 1,
    };
  }
}

function parseEnvelope(stderr: string): { code: string; message: string } {
  const parsed = JSON.parse(stderr.trim());
  expect(parsed.error).toBeTypeOf('object');
  return parsed.error as { code: string; message: string };
}

describe('cli error contract', () => {
  it('envelopes an unknown command in JSON mode', async () => {
    const result = await runCli(['--json', 'does-not-exist']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    const error = parseEnvelope(result.stderr);
    expect(error.code).toBe('USAGE_ERROR');
    expect(error.message).toMatch(/unknown command/);
  });

  it('accepts --json after the subcommand token (global option)', async () => {
    const result = await runCli(['does-not-exist', '--json']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(parseEnvelope(result.stderr).code).toBe('USAGE_ERROR');
  });

  it('prints a human error line for an unknown command', async () => {
    const result = await runCli(['does-not-exist']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr.startsWith('error: ')).toBe(true);
    expect(result.stderr).toMatch(/unknown command/);
    expect(() => JSON.parse(result.stderr.trim())).toThrow();
  });

  it('envelopes an unknown option in JSON mode with no raw Commander text', async () => {
    const result = await runCli(['--json', 'upstream', 'verify', '--nope']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    const error = parseEnvelope(result.stderr);
    expect(error.code).toBe('USAGE_ERROR');
    expect(error.message).toMatch(/unknown option/);
    expect(result.stderr).not.toMatch(/\nerror:/);
  });

  it('maps an unexpected non-CliError failure to INTERNAL_ERROR', async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'singularity-cli-it-'));
    cpSync(distDir, path.join(tempRoot, 'dist'), { recursive: true });
    copyFileSync(
      path.join(repoRoot, 'upstream-lock.json'),
      path.join(tempRoot, 'upstream-lock.json'),
    );
    try {
      const result = await runCli(['upstream', 'verify', '--json'], {
        bin: path.join(tempRoot, 'dist', 'cli.js'),
        cwd: tempRoot,
        env: {
          ...process.env,
          NODE_PATH: nodeModulesRoot,
        },
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toBe('');
      expect(parseEnvelope(result.stderr).code).toBe('INTERNAL_ERROR');
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('keeps stdout empty for every JSON error path', async () => {
    const result = await runCli(['--json', 'nope']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr.trim()).not.toBe('');
  });
});

describe('cli help', () => {
  it('prints human-readable help on --help and exits zero', async () => {
    const result = await runCli(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(/singularity/);
    expect(result.stdout).toMatch(/upstream/);
  });

  it('prints help and exits zero when no arguments are given', async () => {
    const result = await runCli([]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(/Usage:/);
  });
});
