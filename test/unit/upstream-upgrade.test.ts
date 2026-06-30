import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { archivePath } from '../../src/upstream/paths.js';

const exec = promisify(execFile);

let tmpDir: string;
let tmpArchive: string;
let tmpLockfile: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), 'singularity-upgrade-'));
  tmpArchive = path.join(tmpDir, 'bundle.mcpb');
  tmpLockfile = path.join(tmpDir, 'lock.json');

  await copyFile(archivePath, tmpArchive);
  await copyFile(path.join(process.cwd(), 'upstream-lock.json'), tmpLockfile);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function runUpgrade(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await exec(
      'node',
      ['dist/cli.js', 'upstream', 'upgrade', ...args],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          SINGULARITY_UPSTREAM_ARCHIVE: tmpArchive,
          SINGULARITY_UPSTREAM_LOCKFILE: tmpLockfile,
        },
      },
    );
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: e.code ?? 1,
    };
  }
}

describe('upstream upgrade safe-failure invariant', () => {
  it('leaves archive and lockfile byte-identical when download fails', async () => {
    const archiveBefore = await readFile(tmpArchive);
    const lockBefore = await readFile(tmpLockfile, 'utf8');

    const result = await runUpgrade([
      '--to',
      'http://127.0.0.1:59999/nope.mcpb',
      '--json',
    ]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('UPSTREAM_BREAKING_CHANGE');

    const archiveAfter = await readFile(tmpArchive);
    const lockAfter = await readFile(tmpLockfile, 'utf8');

    expect(archiveAfter.equals(archiveBefore)).toBe(true);
    expect(lockAfter).toBe(lockBefore);
  }, 30_000);

  it('fails with USAGE_ERROR when --to is omitted', async () => {
    const result = await runUpgrade(['--json']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('USAGE_ERROR');
  });

  it('upstream:upgrade script wiring includes the upgrade subcommand', async () => {
    const pkg = JSON.parse(
      await readFile(path.join(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.['upstream:upgrade']).toContain('upstream upgrade');
  });
});
