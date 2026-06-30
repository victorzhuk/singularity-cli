import { writeFile } from 'node:fs/promises';
import { sortKeys } from '../core/sortKeys.js';
import { type DiscoveryResult, discoverUpstream } from './discovery.js';
import type { UpstreamLock } from './lockfile.js';

export function resolveTargetUrl(to: string, currentSourceUrl: string): string {
  if (to.startsWith('http://') || to.startsWith('https://')) {
    return to;
  }
  return currentSourceUrl.replace(/\d+\.\d+\.\d+/g, to);
}

export async function downloadArchive(
  url: string,
  destPath: string,
  timeoutMs: number,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) {
      throw new Error(`download failed: ${resp.status} ${resp.statusText}`);
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    await writeFile(destPath, buf);
  } finally {
    clearTimeout(timer);
  }
}

export async function validateCandidate(
  extractedDir: string,
  sha256: string,
  version: string,
): Promise<DiscoveryResult> {
  return discoverUpstream(extractedDir, sha256, version);
}

export function buildLock(
  version: string,
  sha256: string,
  sourceUrl: string,
  downloadedAt: string,
  discovery: DiscoveryResult,
): UpstreamLock {
  return sortKeys({
    version,
    sha256,
    sourceUrl,
    downloadedAt,
    requiredFiles: discovery.requiredFiles,
    discoveredModules: {
      client: { functions: discovery.client.functions },
      modules: discovery.modules,
    },
    adapterMap: discovery.adapterMap,
  }) as unknown as UpstreamLock;
}
