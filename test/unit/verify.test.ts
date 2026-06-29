import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { promisify } from 'node:util';
import { archivePath } from '../../src/upstream/paths.js';

const exec = promisify(execFile);

describe('upstream verify', () => {
  it('exits 0 with deterministic JSON and touches no tracked files', async () => {
    const before = await exec('git', ['status', '--short'], {
      cwd: process.cwd(),
    });

    const start = Date.now();
    const { stdout, stderr } = await exec(
      'node',
      ['dist/cli.js', 'upstream', 'verify', '--json'],
      { cwd: process.cwd() },
    );
    const elapsed = Date.now() - start;

    const after = await exec('git', ['status', '--short'], {
      cwd: process.cwd(),
    });

    expect(stderr).toBe('');
    expect(elapsed).toBeLessThan(10_000);

    const output = JSON.parse(stdout);
    expect(output.status).toBe('ok');
    expect(output.version).toBe('2.1.1');
    expect(output.sha256).toBe(
      'adc127b3ac093073dda150f6bc6e4dac401df1836c8ca4b4e0455ed0ce93210d',
    );
    expect(output.discovered.client).toContain('listTasks');
    expect(output.discovered.modules.task).toEqual({
      functions: ['registerTaskResources', 'registerTaskTools'],
    });

    expect(after.stdout).toBe(before.stdout);
    expect(after.stderr).toBe(before.stderr);
  }, 15_000);

  it('fails JSON envelope when the lockfile is missing', async () => {
    const env = {
      ...process.env,
      SINGULARITY_UPSTREAM_LOCKFILE: path.join(
        tmpdir(),
        'singularity-missing-lock.json',
      ),
    };

    await expect(
      exec('node', ['dist/cli.js', 'upstream', 'verify', '--json'], {
        cwd: process.cwd(),
        env,
      }),
    ).rejects.toMatchObject({
      stdout: '',
      stderr: expect.stringContaining('UPSTREAM_SCHEMA_MISMATCH'),
    });
  });

  it('refers to the bundled archive', () => {
    expect(archivePath).toMatch(/singularity-mcp-server-2\.1\.1\.mcpb$/);
  });
});
