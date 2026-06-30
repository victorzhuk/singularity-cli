import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const repoRoot = process.cwd();
const cliBin = path.join(repoRoot, 'dist', 'cli.js');

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCli(args: string[], cwd = repoRoot): Promise<RunResult> {
  try {
    const { stdout, stderr } = await exec('node', [cliBin, ...args], { cwd, env: process.env });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', exitCode: e.code ?? 1 };
  }
}

let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(path.join(tmpdir(), 'sg-skills-test-'));
});

afterEach(() => {
  const outDir = path.join(tempDir, '.claude');
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
});

const skillPath = (base: string) =>
  path.join(base, '.claude', 'skills', 'singularity-api', 'SKILL.md');

describe('skills generate', () => {
  it('creates SKILL.md with marker and all required rule keywords', async () => {
    const result = await runCli(
      ['skills', '--agent', 'claude', '--output-dir', path.join(tempDir, '.claude'), '--json'],
      tempDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    const out = JSON.parse(result.stdout.trim()) as { generated: boolean; files: string[] };
    expect(out.generated).toBe(true);
    expect(out.files).toHaveLength(1);

    const p = skillPath(tempDir);
    expect(existsSync(p)).toBe(true);

    const content = readFileSync(p, 'utf8');
    expect(content).toContain('singularity_generated: true');
    expect(content).toContain('baseTaskGroup');
    expect(content).toContain('emoji');
    expect(content).toContain('Delta');
    expect(content).toContain('useTime');
    expect(content).toContain('notify');
    expect(content).toContain('priority');
    expect(content).toContain('isNote');
    expect(content).toContain('habit');
    expect(content).toContain('color');
  });

  it('regenerates over an existing generated file successfully', async () => {
    const p = skillPath(tempDir);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, '---\nsingularity_generated: true\n---\nold content\n', 'utf8');

    const result = await runCli(
      ['skills', '--agent', 'claude', '--output-dir', path.join(tempDir, '.claude'), '--json'],
      tempDir,
    );
    expect(result.exitCode).toBe(0);
    const content = readFileSync(p, 'utf8');
    expect(content).toContain('baseTaskGroup');
  });

  it('throws GENERATED_FILE_COLLISION over an unmarked file without --force', async () => {
    const p = skillPath(tempDir);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, 'manually created file without marker\n', 'utf8');

    const result = await runCli(
      ['skills', '--agent', 'claude', '--output-dir', path.join(tempDir, '.claude'), '--json'],
      tempDir,
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    const err = JSON.parse(result.stderr.trim()) as { error: { code: string } };
    expect(err.error.code).toBe('GENERATED_FILE_COLLISION');
  });

  it('overwrites an unmarked file with --force', async () => {
    const p = skillPath(tempDir);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, 'manually created file without marker\n', 'utf8');

    const result = await runCli(
      ['skills', '--agent', 'claude', '--output-dir', path.join(tempDir, '.claude'), '--force', '--json'],
      tempDir,
    );
    expect(result.exitCode).toBe(0);
    const content = readFileSync(p, 'utf8');
    expect(content).toContain('singularity_generated: true');
  });
});

describe('skills --check', () => {
  it('reports missing and exits non-zero on a fresh dir', async () => {
    const outDir = path.join(tempDir, '.claude');
    const result = await runCli(
      ['skills', '--agent', 'claude', '--output-dir', outDir, '--check', '--json'],
      tempDir,
    );
    expect(result.exitCode).not.toBe(0);
    expect(existsSync(skillPath(tempDir))).toBe(false);
    const out = JSON.parse(result.stdout.trim()) as { ok: boolean; missing: string[] };
    expect(out.ok).toBe(false);
    expect(out.missing.length).toBeGreaterThan(0);
  });

  it('reports ok and exits zero when SKILL.md is up to date', async () => {
    const outDir = path.join(tempDir, '.claude');
    await runCli(['skills', '--agent', 'claude', '--output-dir', outDir, '--json'], tempDir);

    const result = await runCli(
      ['skills', '--agent', 'claude', '--output-dir', outDir, '--check', '--json'],
      tempDir,
    );
    expect(result.exitCode).toBe(0);
    const out = JSON.parse(result.stdout.trim()) as { ok: boolean };
    expect(out.ok).toBe(true);
  });

  it('reports stale and exits non-zero when file content differs', async () => {
    const p = skillPath(tempDir);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, '---\nsingularity_generated: true\n---\nstale content\n', 'utf8');

    const result = await runCli(
      ['skills', '--agent', 'claude', '--output-dir', path.join(tempDir, '.claude'), '--check', '--json'],
      tempDir,
    );
    expect(result.exitCode).not.toBe(0);
    const out = JSON.parse(result.stdout.trim()) as { ok: boolean; stale: string[] };
    expect(out.ok).toBe(false);
    expect(out.stale.length).toBeGreaterThan(0);
  });
});

describe('skills --agent unsupported', () => {
  it('exits non-zero with NOT_IMPLEMENTED for --agent cursor', async () => {
    const result = await runCli(
      ['skills', '--agent', 'cursor', '--output-dir', path.join(tempDir, '.claude'), '--json'],
      tempDir,
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    const err = JSON.parse(result.stderr.trim()) as { error: { code: string } };
    expect(err.error.code).toBe('NOT_IMPLEMENTED');
  });
});

describe('skills --with-commands', () => {
  it('generates wrapper files under commands/singularity/', async () => {
    const outDir = path.join(tempDir, '.claude');
    const result = await runCli(
      ['skills', '--agent', 'claude', '--output-dir', outDir, '--with-commands', '--json'],
      tempDir,
    );
    expect(result.exitCode).toBe(0);
    const out = JSON.parse(result.stdout.trim()) as { generated: boolean; files: string[] };
    expect(out.generated).toBe(true);
    expect(out.files.length).toBeGreaterThan(1);

    const commandsDir = path.join(outDir, 'commands', 'singularity');
    expect(existsSync(commandsDir)).toBe(true);

    const wrapper = path.join(commandsDir, 'tasks-create.md');
    expect(existsSync(wrapper)).toBe(true);
    const wContent = readFileSync(wrapper, 'utf8');
    expect(wContent).toContain('singularity_generated: true');
  });
});
