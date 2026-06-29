import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { discoverUpstream } from '../../src/upstream/discovery.js';
import { archivePath, extractedDir } from '../../src/upstream/paths.js';
import { readLockfile } from '../../src/upstream/lockfile.js';
import { extractArchive } from '../../src/upstream/extract.js';

describe('upstream lockfile', () => {
  it('is byte-stable across discovery runs except for downloadedAt', async () => {
    if (!existsSync(extractedDir)) {
      await extractArchive(archivePath, extractedDir);
    }

    const lock = await readLockfile();
    const discovery = await discoverUpstream(extractedDir, lock.sha256);

    const run1 = {
      version: lock.version,
      sourceUrl: lock.sourceUrl,
      sha256: lock.sha256,
      requiredFiles: lock.requiredFiles,
      discoveredModules: lock.discoveredModules,
      adapterMap: lock.adapterMap,
    };

    const run2 = {
      version: discovery.version,
      sourceUrl: lock.sourceUrl,
      sha256: discovery.sha256,
      requiredFiles: discovery.requiredFiles,
      discoveredModules: {
        client: discovery.client,
        modules: discovery.modules,
      },
      adapterMap: discovery.adapterMap,
    };

    expect(run1).toEqual(run2);
  });
});
