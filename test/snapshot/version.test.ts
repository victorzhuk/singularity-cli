import { describe, expect, it } from 'vitest';
import { cliVersion } from '../../src/core/pkg.js';
import { readLockfile } from '../../src/upstream/lockfile.js';

async function buildVersionPayload() {
  let mcpbVersion = '';
  let mcpbSha256 = '';
  let packageSourceUrl = '';
  try {
    const lock = await readLockfile();
    mcpbVersion = lock.version;
    mcpbSha256 = lock.sha256;
    packageSourceUrl = lock.sourceUrl;
  } catch {
    // lockfile unreadable — degrade gracefully
  }
  return {
    cliVersion: cliVersion(),
    mcpbVersion,
    mcpbSha256,
    packageSourceUrl,
    nodeVersion: process.version,
    platform: process.platform,
  };
}

describe('version payload', () => {
  it('stable fields match snapshot', async () => {
    const payload = await buildVersionPayload();
    const { mcpbVersion, mcpbSha256, packageSourceUrl } = payload;
    expect({ mcpbVersion, mcpbSha256, packageSourceUrl }).toMatchSnapshot();
  });

  it('cliVersion is a semver string', async () => {
    const payload = await buildVersionPayload();
    expect(payload.cliVersion).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('nodeVersion and platform are present strings', async () => {
    const payload = await buildVersionPayload();
    expect(typeof payload.nodeVersion).toBe('string');
    expect(payload.nodeVersion.startsWith('v')).toBe(true);
    expect(typeof payload.platform).toBe('string');
    expect(payload.platform.length).toBeGreaterThan(0);
  });
});
