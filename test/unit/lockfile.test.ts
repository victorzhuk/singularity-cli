import { describe, expect, it } from 'vitest';
import { verifyUpstreamRuntime } from '../../src/upstream/runtime.js';
import { readLockfile } from '../../src/upstream/lockfile.js';

describe('upstream lockfile', () => {
  it('is byte-stable across discovery runs except for downloadedAt', async () => {
    const lock = await readLockfile();
    const { discovery } = await verifyUpstreamRuntime();

    const fromLock = {
      version: lock.version,
      sha256: lock.sha256,
      requiredFiles: lock.requiredFiles,
      discoveredModules: lock.discoveredModules,
      adapterMap: lock.adapterMap,
    };

    const fromDiscovery = {
      version: discovery.version,
      sha256: discovery.sha256,
      requiredFiles: discovery.requiredFiles,
      discoveredModules: {
        client: discovery.client,
        modules: discovery.modules,
      },
      adapterMap: discovery.adapterMap,
    };

    expect(fromLock).toEqual(fromDiscovery);
  });
});
