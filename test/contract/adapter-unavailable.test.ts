import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const emptyExtractedDir = path.resolve(
  process.cwd(),
  'test/fixtures/empty-extracted',
);

describe('singularity adapter unavailable', () => {
  beforeAll(async () => {
    vi.doMock('../../src/upstream/runtime.js', () => ({
      loadUpstreamRuntime: async () => ({ runtimePath: emptyExtractedDir }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects with ADAPTER_UNAVAILABLE when ApiClient is missing', async () => {
    const { createSingularityAdapter } = await import(
      '../../src/adapters/singularity/adapter.js'
    );
    const { AdapterUnavailableError } = await import(
      '../../src/core/errors.js'
    );

    const adapter = createSingularityAdapter({
      baseUrl: 'https://api.test',
      accessToken: 'token',
    });

    await expect(adapter.listTasks()).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(AdapterUnavailableError);
      const adapterErr = err as AdapterUnavailableError;
      expect(adapterErr.code).toBe('ADAPTER_UNAVAILABLE');
      expect(adapterErr.message).toContain('ApiClient');
      return true;
    });
  });
});
