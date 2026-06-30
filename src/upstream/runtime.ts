import { mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { UpstreamSchemaMismatchError } from '../core/errors.js';
import { discoverUpstream, type DiscoveryResult } from './discovery.js';
import { extractArchive } from './extract.js';
import { sha256File } from './hash.js';
import { readLockfile, type UpstreamLock } from './lockfile.js';
import { archivePath, lockfilePath } from './paths.js';

export interface UpstreamRuntimeOptions {
  lockfilePath?: string;
  archivePath?: string;
  cacheDir?: string;
}

export interface UpstreamRuntime {
  runtimePath: string;
  lock: UpstreamLock;
  discovery: DiscoveryResult;
}

export interface VerifiedUpstream {
  lock: UpstreamLock;
  discovery: DiscoveryResult;
}

export function defaultCacheDir(): string {
  const override = process.env.SINGULARITY_CLI_CACHE_DIR;
  if (override) {
    return override;
  }

  const home = process.env.HOME ?? tmpdir();
  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'Library', 'Caches', 'singularity-cli');
    case 'win32':
      return path.join(process.env.LOCALAPPDATA ?? home, 'singularity-cli');
    default:
      return path.join(
        process.env.XDG_CACHE_HOME ?? path.join(home, '.cache'),
        'singularity-cli',
      );
  }
}

interface ResolvedOptions {
  lockfilePath: string;
  archivePath: string;
  cacheDir: string;
}

function resolveOptions(options?: UpstreamRuntimeOptions): ResolvedOptions {
  return {
    lockfilePath: options?.lockfilePath ?? lockfilePath,
    archivePath: options?.archivePath ?? archivePath,
    cacheDir: options?.cacheDir ?? defaultCacheDir(),
  };
}

function cacheKeyDir(cacheDir: string, lock: UpstreamLock): string {
  return path.join(cacheDir, `upstream-${lock.version}-${lock.sha256}`);
}

function isEnoent(err: unknown): boolean {
  return (err as NodeJS.ErrnoException)?.code === 'ENOENT';
}

async function readValidatedLock(lockfile: string): Promise<UpstreamLock> {
  try {
    return await readLockfile(lockfile);
  } catch (err) {
    if (err instanceof UpstreamSchemaMismatchError) {
      throw err;
    }
    if (isEnoent(err)) {
      throw new UpstreamSchemaMismatchError('upstream-lock.json not found', {
        path: lockfile,
      });
    }
    throw err;
  }
}

async function assertArchiveHash(
  archive: string,
  expected: string,
): Promise<string> {
  const actual = await sha256File(archive);
  if (actual !== expected) {
    throw new UpstreamSchemaMismatchError('upstream archive sha256 mismatch', {
      expected,
      actual,
    });
  }
  return actual;
}

async function isCacheComplete(
  dir: string,
  lock: UpstreamLock,
): Promise<boolean> {
  try {
    for (const name of lock.requiredFiles) {
      const info = await stat(path.join(dir, name));
      if (name.endsWith('/') && !info.isDirectory()) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function extractAndDiscover(
  archive: string,
  sha256: string,
  version: string,
  tempParent: string = tmpdir(),
): Promise<{ tempDir: string; discovery: DiscoveryResult }> {
  const tempDir = await mkdtemp(
    path.join(tempParent, 'singularity-upstream-'),
  );
  try {
    await extractArchive(archive, tempDir);
    const discovery = await discoverUpstream(tempDir, sha256, version);
    return { tempDir, discovery };
  } catch (err) {
    await rm(tempDir, { recursive: true, force: true });
    throw err;
  }
}

export async function loadUpstreamRuntime(
  options?: UpstreamRuntimeOptions,
): Promise<UpstreamRuntime> {
  const opts = resolveOptions(options);
  const lock = await readValidatedLock(opts.lockfilePath);
  const sha256 = await assertArchiveHash(opts.archivePath, lock.sha256);

  const keyDir = cacheKeyDir(opts.cacheDir, lock);
  await mkdir(opts.cacheDir, { recursive: true });

  if (await isCacheComplete(keyDir, lock)) {
    return {
      runtimePath: keyDir,
      lock,
      discovery: await discoverUpstream(keyDir, sha256, lock.version),
    };
  }

  const { tempDir, discovery } = await extractAndDiscover(
    opts.archivePath,
    sha256,
    lock.version,
    opts.cacheDir,
  );

  try {
    try {
      await rename(tempDir, keyDir);
    } catch {
      if (await isCacheComplete(keyDir, lock)) {
        return {
          runtimePath: keyDir,
          lock,
          discovery: await discoverUpstream(keyDir, sha256, lock.version),
        };
      }
      await rm(keyDir, { recursive: true, force: true });
      await rename(tempDir, keyDir);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }

  return { runtimePath: keyDir, lock, discovery };
}

export async function verifyUpstreamRuntime(
  options?: UpstreamRuntimeOptions,
): Promise<VerifiedUpstream> {
  const opts = resolveOptions(options);
  const lock = await readValidatedLock(opts.lockfilePath);
  const sha256 = await assertArchiveHash(opts.archivePath, lock.sha256);

  const { tempDir, discovery } = await extractAndDiscover(
    opts.archivePath,
    sha256,
    lock.version,
  );
  await rm(tempDir, { recursive: true, force: true });

  return { lock, discovery };
}
