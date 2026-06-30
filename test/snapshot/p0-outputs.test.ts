import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  normalizeTask,
  normalizeTaskList,
  normalizeProject,
  normalizeProjectList,
} from '../../src/adapters/singularity/normalize.js';
import { ValidationFailedError, formatErrorEnvelope } from '../../src/core/errors.js';

const goldenDir = path.join(process.cwd(), 'test/fixtures/golden');
const upstreamDir = path.join(process.cwd(), 'test/fixtures/upstream');

function loadGolden(name: string): unknown {
  return JSON.parse(readFileSync(path.join(goldenDir, `${name}.json`), 'utf8'));
}

function loadUpstream(name: string): unknown {
  return JSON.parse(readFileSync(path.join(upstreamDir, `${name}.json`), 'utf8'));
}

describe('P0 output normalization snapshots', () => {
  it('tasks list snapshot', () => {
    const result = normalizeTaskList(loadGolden('listTasks'), 'tasks list');
    expect(result).toMatchSnapshot();
  });

  it('projects list snapshot', () => {
    const result = normalizeProjectList(loadGolden('listProjects'), 'projects list');
    expect(result).toMatchSnapshot();
  });

  it('single task snapshot', () => {
    const result = normalizeTask(loadUpstream('getTask'), 'tasks get');
    expect(result).toMatchSnapshot();
  });

  it('single project snapshot', () => {
    const result = normalizeProject(loadGolden('getProject'), 'projects get');
    expect(result).toMatchSnapshot();
  });

  it('null task list normalizes to { items: [] }', () => {
    expect(normalizeTaskList(null, 'tasks list')).toEqual({ items: [] });
  });

  it('empty array normalizes to { items: [] }', () => {
    expect(normalizeTaskList([], 'tasks list')).toEqual({ items: [] });
  });

  it('null project list normalizes to { items: [] }', () => {
    expect(normalizeProjectList(null, 'projects list')).toEqual({ items: [] });
  });

  it('VALIDATION_FAILED error envelope snapshot', () => {
    const err = new ValidationFailedError('title required', { fields: ['title'] });
    expect(formatErrorEnvelope(err)).toMatchSnapshot();
  });
});
