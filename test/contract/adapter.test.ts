import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import nock from 'nock';
import { createSingularityAdapter } from '../../src/adapters/singularity/adapter.js';

const baseUrl = 'https://api.test';

function loadFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(`test/fixtures/upstream/${name}.json`, 'utf8'),
  );
}

function createAdapter() {
  return createSingularityAdapter({
    baseUrl,
    accessToken: 'test-token',
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
});
