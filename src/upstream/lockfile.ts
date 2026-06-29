import { readFile, writeFile } from 'node:fs/promises';
import { lockfilePath } from './paths.js';

export interface UpstreamLock {
  version: string;
  sourceUrl: string;
  downloadedAt: string;
  sha256: string;
  requiredFiles: string[];
  discoveredModules: {
    client: { functions: string[] };
    modules: Record<string, { functions: string[] }>;
  };
  adapterMap: Record<string, { source: string; method: string }>;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}

export async function writeLockfile(lock: UpstreamLock): Promise<void> {
  const serialized = JSON.stringify(sortKeys(lock), null, 2) + '\n';
  await writeFile(lockfilePath, serialized, 'utf8');
}

export async function readLockfile(): Promise<UpstreamLock> {
  const content = await readFile(lockfilePath, 'utf8');
  return JSON.parse(content) as UpstreamLock;
}
