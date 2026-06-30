import { execFile } from 'node:child_process';
import * as http from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);

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

describe('upstream check --json updateAvailable:true', () => {
  let server: http.Server;
  let serverUrl: string;
  let tmpDir2: string;
  let tmpLockfile2: string;

  beforeEach(async () => {
    tmpDir2 = await mkdtemp(path.join(tmpdir(), 'singularity-check-ua-'));
    tmpLockfile2 = path.join(tmpDir2, 'lock.json');

    const realLock = JSON.parse(
      await readFile(path.join(process.cwd(), 'upstream-lock.json'), 'utf8'),
    ) as Record<string, unknown>;

    const archiveContent = Buffer.from('fake-archive-content-for-test');
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(archiveContent);
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as { port: number };
    serverUrl = `http://127.0.0.1:${addr.port}/bundle.mcpb`;

    await writeFile(
      tmpLockfile2,
      JSON.stringify({
        ...realLock,
        sourceUrl: serverUrl,
        sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }, null, 2),
    );
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(tmpDir2, { recursive: true, force: true });
  });

  it.skipIf(nodeMajor < 22)('reports updateAvailable:true when remote sha256 differs from lock', async () => {
    const { stdout } = await exec(
      'node',
      ['dist/cli.js', 'upstream', 'check', '--json'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          SINGULARITY_UPSTREAM_LOCKFILE: tmpLockfile2,
        },
      },
    );

    const output = JSON.parse(stdout) as Record<string, unknown>;
    expect(output.updateAvailable).toBe(true);
    expect(typeof output.candidateSha256).toBe('string');
    expect(output.candidateSha256).not.toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  }, 30_000);
});
