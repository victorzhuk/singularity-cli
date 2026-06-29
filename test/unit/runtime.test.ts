import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { archivePath } from '../../src/upstream/paths.js';
import { sha256File } from '../../src/upstream/hash.js';
import { readLockfile } from '../../src/upstream/lockfile.js';
import {
  loadUpstreamRuntime,
  verifyUpstreamRuntime,
} from '../../src/upstream/runtime.js';

const repoRoot = path.resolve(process.cwd());

let workspace: string;
let cache: string;
let lockPath: string;

beforeEach(async () => {
  workspace = await mkdtemp(path.join(tmpdir(), 'singularity-rt-'));
  cache = path.join(workspace, 'cache');
  lockPath = path.join(workspace, 'lock.json');
  const lock = await readLockfile();
  await writeFile(lockPath, JSON.stringify(lock));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

async function cacheEntries(): Promise<string[]> {
  try {
    return await readdir(cache);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

describe('upstream runtime loader', () => {
  it('rejects a sha256 mismatch before extraction and creates no cache', async () => {
    const lock = await readLockfile();
    await writeFile(
      lockPath,
      JSON.stringify({ ...lock, sha256: '0'.repeat(64) }),
    );

    await expect(
      loadUpstreamRuntime({ lockfilePath: lockPath, archivePath, cacheDir: cache }),
    ).rejects.toMatchObject({ code: 'UPSTREAM_SCHEMA_MISMATCH' });

    await expect(stat(cache)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('cleans temp directories when extraction fails', async () => {
    const corruptArchive = path.join(workspace, 'corrupt.mcpb');
    const original = await readFile(archivePath);
    await writeFile(corruptArchive, original.subarray(0, 64));
    const corruptSha = await sha256File(corruptArchive);

    const lock = await readLockfile();
    await writeFile(lockPath, JSON.stringify({ ...lock, sha256: corruptSha }));

    await expect(
      loadUpstreamRuntime({
        lockfilePath: lockPath,
        archivePath: corruptArchive,
        cacheDir: cache,
      }),
    ).rejects.toThrow();

    const entries = await cacheEntries();
    expect(entries.filter((entry) => entry.startsWith('singularity-upstream-'))).toEqual([]);
    expect(entries.some((entry) => entry.startsWith('upstream-'))).toBe(false);
  });

  it('writes the runtime cache outside the package tree', async () => {
    const { runtimePath } = await loadUpstreamRuntime({
      lockfilePath: lockPath,
      archivePath,
      cacheDir: cache,
    });

    expect(runtimePath.startsWith(cache)).toBe(true);
    expect(runtimePath.startsWith(repoRoot)).toBe(false);

    const verified = await verifyUpstreamRuntime({
      lockfilePath: lockPath,
      archivePath,
    });
    expect(verified.discovery.version).toBe('2.1.1');
  });

  it('reuses a single cache directory for concurrent calls', async () => {
    const [first, second] = await Promise.all([
      loadUpstreamRuntime({ lockfilePath: lockPath, archivePath, cacheDir: cache }),
      loadUpstreamRuntime({ lockfilePath: lockPath, archivePath, cacheDir: cache }),
    ]);

    expect(first.runtimePath).toBe(second.runtimePath);

    const entries = await cacheEntries();
    const keyDirs = entries.filter((entry) => entry.startsWith('upstream-'));
    expect(keyDirs).toHaveLength(1);
    expect(entries.filter((entry) => entry.startsWith('singularity-upstream-'))).toEqual([]);
  });

  it('rebuilds a stale partial cache directory', async () => {
    const lock = await readLockfile();
    const keyDir = path.join(cache, `upstream-${lock.version}-${lock.sha256}`);
    await mkdir(keyDir, { recursive: true });
    await writeFile(path.join(keyDir, 'client.js'), 'module.exports = {};');

    const { runtimePath } = await loadUpstreamRuntime({
      lockfilePath: lockPath,
      archivePath,
      cacheDir: cache,
    });

    expect(runtimePath).toBe(keyDir);

    for (const name of lock.requiredFiles) {
      await expect(stat(path.join(keyDir, name))).resolves.toBeTruthy();
    }

    const entries = await cacheEntries();
    const keyDirs = entries.filter((entry) => entry.startsWith('upstream-'));
    expect(keyDirs).toHaveLength(1);
    expect(entries.filter((entry) => entry.startsWith('singularity-upstream-'))).toEqual([]);
  });
});
