import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const exec = promisify(execFile);

let tmpDir: string;
let tmpLockfile: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), 'singularity-check-'));
  tmpLockfile = path.join(tmpDir, 'lock.json');

  const realLock = JSON.parse(
    await readFile(path.join(process.cwd(), 'upstream-lock.json'), 'utf8'),
  );
  await writeFile(
    tmpLockfile,
    JSON.stringify({ ...realLock, sourceUrl: 'http://127.0.0.1:59999/nope.mcpb' }, null, 2),
  );
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('upstream check --json', () => {
  it('exits 0 and reports updateAvailable:false when source URL is unreachable', async () => {
    const before = await exec('git', ['status', '--short'], {
      cwd: process.cwd(),
    });

    const { stdout, stderr } = await exec(
      'node',
      ['dist/cli.js', 'upstream', 'check', '--json'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          SINGULARITY_UPSTREAM_LOCKFILE: tmpLockfile,
        },
      },
    );

    const after = await exec('git', ['status', '--short'], {
      cwd: process.cwd(),
    });

    const output = JSON.parse(stdout);
    expect(output.updateAvailable).toBe(false);
    expect(typeof output.currentVersion).toBe('string');
    expect(typeof output.sourceUrl).toBe('string');
    expect(typeof output.sha256).toBe('string');
    expect(output.candidateSha256).toBeUndefined();

    expect(stderr).toContain('upstream check');

    expect(after.stdout).toBe(before.stdout);
    expect(after.stderr).toBe(before.stderr);
  }, 20_000);
});
