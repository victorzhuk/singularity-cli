import { execFile } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const repoRoot = process.cwd();

interface PackEntry {
  path: string;
}

interface PackResult {
  files: PackEntry[];
}

async function runPackDryRun(): Promise<PackResult> {
  const { stdout } = await exec('npm', ['pack', '--dry-run', '--json'], {
    cwd: repoRoot,
  });
  const parsed = JSON.parse(stdout) as PackResult[];
  return parsed[0];
}

describe('npm package boundary', () => {
  it('only publishes intended files', async () => {
    const pack = await runPackDryRun();
    const paths = pack.files.map((f) => f.path);

    expect(paths).toContain('dist/cli.js');
    expect(paths).toContain('upstream-lock.json');
    expect(paths).toContain('upstream/singularity-mcp-server-2.1.1.mcpb');

    for (const prefix of ['src/', 'test/', 'openspec/', 'scripts/']) {
      expect(paths.some((p) => p.startsWith(prefix))).toBe(false);
    }
    expect(paths.some((p) => p.startsWith('upstream/extracted/'))).toBe(false);
  });

  it(
    'installs the packed tarball and runs the CLI',
    async () => {
      const tempRoot = mkdtempSync(path.join(tmpdir(), 'singularity-pack-'));
      const projectDir = path.join(tempRoot, 'project');
      mkdirSync(projectDir, { recursive: true });

      try {
        const { stdout: packOutput } = await exec(
          'npm',
          ['pack', '--pack-destination', tempRoot],
          { cwd: repoRoot },
        );
        const tarballName = packOutput.trim().split('\n').pop() ?? '';
        const tarball = path.join(tempRoot, tarballName);
        expect(existsSync(tarball)).toBe(true);

        await exec('npm', ['install', tarball], { cwd: projectDir });

        const bin = path.join(
          projectDir,
          'node_modules',
          '.bin',
          'singularity',
        );
        const { stdout: help } = await exec('node', [bin, '--help'], {
          cwd: projectDir,
        });
        expect(help).toMatch(/singularity/);

        const env = {
          ...process.env,
          SINGULARITY_CLI_CACHE_DIR: path.join(tempRoot, 'cache'),
        };
        const { stdout, stderr } = await exec(
          'node',
          [bin, 'upstream', 'verify', '--json'],
          { cwd: projectDir, env },
        );
        expect(stderr).toBe('');
        const output = JSON.parse(stdout);
        expect(output.status).toBe('ok');
        expect(output.version).toBe('2.1.1');
      } finally {
        rmSync(tempRoot, { recursive: true, force: true });
      }
    },
    120_000,
  );
});
