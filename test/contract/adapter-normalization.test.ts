import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeTask, normalizeProject, normalizeTaskList, normalizeProjectList } from '../../src/adapters/singularity/normalize.js';
import { UpstreamSchemaMismatchError } from '../../src/core/errors.js';

function loadFixture(dir: string, name: string): unknown {
  return JSON.parse(readFileSync(`test/fixtures/${dir}/${name}.json`, 'utf8'));
}

describe('normalizeTaskList', () => {
  it('null → empty list', () => {
    expect(normalizeTaskList(null, 'tasks list')).toEqual({ items: [] });
  });

  it('{ items: null } → empty list', () => {
    expect(normalizeTaskList({ items: null }, 'tasks list')).toEqual({ items: [] });
  });

  it('empty array → empty list', () => {
    expect(normalizeTaskList([], 'tasks list')).toEqual({ items: [] });
  });

  it('listTasksEmpty fixture → empty list', () => {
    const raw = loadFixture('upstream', 'listTasksEmpty');
    expect(normalizeTaskList(raw, 'tasks list')).toEqual({ items: [] });
  });
});

describe('normalizeProjectList', () => {
  it('null → empty list', () => {
    expect(normalizeProjectList(null, 'projects list')).toEqual({ items: [] });
  });

  it('[] → empty list', () => {
    expect(normalizeProjectList([], 'projects list')).toEqual({ items: [] });
  });
});

describe('normalizeTask', () => {
  it('missing id → UPSTREAM_SCHEMA_MISMATCH with command and missingFields', () => {
    expect(() => normalizeTask({ title: 'no id' }, 'tasks create')).toThrow(UpstreamSchemaMismatchError);
    try {
      normalizeTask({ title: 'no id' }, 'tasks create');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamSchemaMismatchError);
      const e = err as UpstreamSchemaMismatchError;
      expect(e.code).toBe('UPSTREAM_SCHEMA_MISMATCH');
      expect(e.details).toMatchObject({ command: 'tasks create', missingFields: ['id'] });
    }
  });

  it('null input → UPSTREAM_SCHEMA_MISMATCH', () => {
    expect(() => normalizeTask(null, 'tasks get')).toThrow(UpstreamSchemaMismatchError);
  });
});

describe('normalizeProject', () => {
  it('missing id → UPSTREAM_SCHEMA_MISMATCH', () => {
    expect(() => normalizeProject({ name: 'no id' }, 'projects create')).toThrow(UpstreamSchemaMismatchError);
    try {
      normalizeProject({ name: 'no id' }, 'projects create');
    } catch (err) {
      const e = err as UpstreamSchemaMismatchError;
      expect(e.details).toMatchObject({ command: 'projects create', missingFields: ['id'] });
    }
  });
});

describe('golden fixture round-trips', () => {
  it('listTasks upstream → golden', () => {
    const upstream = loadFixture('upstream', 'listTasks');
    const golden = loadFixture('golden', 'listTasks');
    expect(normalizeTaskList(upstream, 'tasks list')).toEqual(golden);
  });

  it('listProjects upstream → golden', () => {
    const upstream = loadFixture('upstream', 'listProjects');
    const golden = loadFixture('golden', 'listProjects');
    expect(normalizeProjectList(upstream, 'projects list')).toEqual(golden);
  });

  it('getProject upstream → golden', () => {
    const upstream = loadFixture('upstream', 'getProject');
    const golden = loadFixture('golden', 'getProject');
    expect(normalizeProject(upstream, 'projects get')).toEqual(golden);
  });

  it('createTask upstream → golden', () => {
    const upstream = loadFixture('upstream', 'createTask');
    const golden = loadFixture('golden', 'createTask');
    expect(normalizeTask(upstream, 'tasks create')).toEqual(golden);
  });

  it('updateTask upstream → golden', () => {
    const upstream = loadFixture('upstream', 'updateTask');
    const golden = loadFixture('golden', 'updateTask');
    expect(normalizeTask(upstream, 'tasks update')).toEqual(golden);
  });

  it('completeTask upstream → golden', () => {
    const upstream = loadFixture('upstream', 'completeTask');
    const golden = loadFixture('golden', 'completeTask');
    expect(normalizeTask(upstream, 'tasks complete')).toEqual(golden);
  });
});
