import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import nock from 'nock';
import { createSingularityAdapter } from '../../src/adapters/singularity/adapter.js';

const baseUrl = 'https://api.test';
const accessToken = 'test-token';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(`test/fixtures/upstream/${name}.json`, 'utf8'));
}

function createAdapter() {
  return createSingularityAdapter({ baseUrl, accessToken });
}

describe('singularity adapter mutations', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('createTask posts to /v2/task and resolves', async () => {
    const fixture = loadFixture('createTask');
    nock(baseUrl).post('/v2/task').reply(201, fixture);
    const adapter = createAdapter();
    await expect(adapter.createTask({ title: 'My task' })).resolves.toEqual(fixture);
  });

  it('updateTask patches /v2/task/:id and resolves', async () => {
    const fixture = loadFixture('updateTask');
    nock(baseUrl).patch('/v2/task/task-1').reply(200, fixture);
    const adapter = createAdapter();
    await expect(adapter.updateTask({ id: 'task-1', title: 'Updated task' })).resolves.toEqual(fixture);
  });

  it('completeTask patches /v2/task/:id with status done', async () => {
    const fixture = loadFixture('completeTask');
    nock(baseUrl).patch('/v2/task/task-1', { id: 'task-1', status: 'done' }).reply(200, fixture);
    const adapter = createAdapter();
    await expect(adapter.completeTask({ id: 'task-1' })).resolves.toEqual(fixture);
  });

  it('moveTask patches /v2/task/:id with new projectId', async () => {
    const fixture = loadFixture('moveTask');
    nock(baseUrl).patch('/v2/task/task-1', { id: 'task-1', projectId: 'project-2' }).reply(200, fixture);
    const adapter = createAdapter();
    await expect(adapter.moveTask({ id: 'task-1', projectId: 'project-2' })).resolves.toEqual(fixture);
  });

  it('deleteTask deletes /v2/task/:id and resolves', async () => {
    nock(baseUrl).delete('/v2/task/task-1').reply(200);
    const adapter = createAdapter();
    await expect(adapter.deleteTask('task-1')).resolves.toBeUndefined();
  });

  it('createProject posts to /v2/project and resolves', async () => {
    const fixture = loadFixture('createProject');
    nock(baseUrl).post('/v2/project').reply(201, fixture);
    const adapter = createAdapter();
    await expect(adapter.createProject({ name: 'New Project' })).resolves.toEqual(fixture);
  });

  it('updateProject patches /v2/project/:id and resolves', async () => {
    const fixture = loadFixture('updateProject');
    nock(baseUrl).patch('/v2/project/project-3').reply(200, fixture);
    const adapter = createAdapter();
    await expect(adapter.updateProject({ id: 'project-3', name: 'Renamed Project' })).resolves.toEqual(fixture);
  });

  it('authStatus calls listProjects with maxCount=1 and resolves', async () => {
    const fixture = loadFixture('authStatus');
    nock(baseUrl).get('/v2/project').query({ maxCount: '1' }).reply(200, fixture);
    const adapter = createAdapter();
    await expect(adapter.authStatus()).resolves.toEqual(fixture);
  });

  it('maps 401 to AUTH_TOKEN_INVALID', async () => {
    nock(baseUrl).post('/v2/task').reply(401, { error: 'unauthorized' });
    const adapter = createAdapter();
    await expect(adapter.createTask({ title: 'x' })).rejects.toMatchObject({
      code: 'AUTH_TOKEN_INVALID',
    });
  });

  it('maps 403 to AUTH_SCOPE_DENIED', async () => {
    nock(baseUrl).post('/v2/task').reply(403, { error: 'forbidden' });
    const adapter = createAdapter();
    await expect(adapter.createTask({ title: 'x' })).rejects.toMatchObject({
      code: 'AUTH_SCOPE_DENIED',
    });
  });

  it('redacts the token from mutation error details', async () => {
    nock(baseUrl).post('/v2/task').reply(401, { error: `bad token ${accessToken}` });
    const adapter = createAdapter();
    await expect(adapter.createTask({ title: 'x' })).rejects.toSatisfy((err: unknown) => {
      const serialized = JSON.stringify(err);
      expect(serialized).not.toContain(accessToken);
      expect(serialized).toContain('[REDACTED]');
      return true;
    });
  });
});
