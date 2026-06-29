import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import nock from 'nock';
import { createSingularityAdapter } from '../../src/adapters/singularity/adapter.js';

const baseUrl = 'https://api.test';
const accessToken = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(`test/fixtures/upstream/${name}.json`, 'utf8'),
  );
}

function createAdapter(options?: { requestTimeoutMs?: number }) {
  return createSingularityAdapter({
    baseUrl,
    accessToken,
    requestTimeoutMs: options?.requestTimeoutMs,
  });
}

describe('singularity adapter', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('listTasks returns the fixture response', async () => {
    const fixture = loadFixture('listTasks');
    nock(baseUrl).get('/v2/task').reply(200, fixture);

    const adapter = createAdapter();
    await expect(adapter.listTasks()).resolves.toEqual(fixture);
  });

  it('getTask returns the fixture response', async () => {
    const fixture = loadFixture('getTask');
    nock(baseUrl).get('/v2/task/task-1').reply(200, fixture);

    const adapter = createAdapter();
    await expect(adapter.getTask('task-1')).resolves.toEqual(fixture);
  });

  it('listProjects returns the fixture response', async () => {
    const fixture = loadFixture('listProjects');
    nock(baseUrl).get('/v2/project').reply(200, fixture);

    const adapter = createAdapter();
    await expect(adapter.listProjects()).resolves.toEqual(fixture);
  });

  it('getProject returns the fixture response', async () => {
    const fixture = loadFixture('getProject');
    nock(baseUrl).get('/v2/project/project-1').reply(200, fixture);

    const adapter = createAdapter();
    await expect(adapter.getProject('project-1')).resolves.toEqual(fixture);
  });

  it('passes query params to listTasks', async () => {
    const fixture = loadFixture('listTasks');
    nock(baseUrl)
      .get('/v2/task')
      .query({ includeArchived: 'true' })
      .reply(200, fixture);

    const adapter = createAdapter();
    await expect(
      adapter.listTasks({ includeArchived: true }),
    ).resolves.toEqual(fixture);
  });

  it('normalizes an HTTP failure into a token-safe CliError', async () => {
    nock(baseUrl).get('/v2/task').reply(500, { message: 'server exploded' });

    const adapter = createAdapter();
    await expect(adapter.listTasks()).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(Error);
      const e = err as { code: string; message: string; details?: unknown };
      expect(e.code).toBe('ADAPTER_UNAVAILABLE');
      expect(e.message).toContain('listTasks failed');
      expect(JSON.stringify(e)).toContain('server exploded');
      expect(JSON.stringify(e)).toContain('"status":500');
      return true;
    });
  });

  it('fails with NETWORK_TIMEOUT when the request exceeds the timeout', async () => {
    nock(baseUrl).get('/v2/task').delayBody(200).reply(200, []);

    const adapter = createAdapter({ requestTimeoutMs: 10 });
    await expect(adapter.listTasks()).rejects.toMatchObject({
      code: 'NETWORK_TIMEOUT',
      details: { operation: 'listTasks', timeoutMs: 10 },
    });
  });

  it('redacts the access token from failed request details', async () => {
    nock(baseUrl)
      .get('/v2/task')
      .reply(401, { error: `invalid token ${accessToken}` });

    const adapter = createAdapter();
    await expect(adapter.listTasks()).rejects.toSatisfy((err: unknown) => {
      const serialized = JSON.stringify(err);
      expect(serialized).not.toContain(accessToken);
      expect(serialized).toContain('[REDACTED]');
      return true;
    });
  });
});
