import { describe, it, expect } from 'vitest';
import { buildUpdateTagPayload, buildCreateTagPayload } from '../../src/commands/tags.js';
import { buildUpdateTaskGroupPayload, buildCreateTaskGroupPayload } from '../../src/commands/taskgroups.js';
import { performSearch } from '../../src/commands/search.js';
import { generateCompletionScript } from '../../src/commands/completion.js';
import { AdapterUnavailableError, ValidationFailedError } from '../../src/core/errors.js';

describe('search', () => {
  it('throws AdapterUnavailableError with method:search', () => {
    expect(() => performSearch('anything')).toThrow(AdapterUnavailableError);
  });

  it('error code is ADAPTER_UNAVAILABLE', () => {
    let err: AdapterUnavailableError | null = null;
    try {
      performSearch('query');
    } catch (e) {
      err = e as AdapterUnavailableError;
    }
    expect(err?.code).toBe('ADAPTER_UNAVAILABLE');
    expect(err?.details?.method).toBe('search');
  });
});

describe('generateCompletionScript', () => {
  const names = ['singularity', 'tasks', 'projects', 'tags'];

  it('bash: returns non-empty script containing singularity', () => {
    const script = generateCompletionScript('bash', names);
    expect(script.length).toBeGreaterThan(0);
    expect(script).toContain('singularity');
  });

  it('zsh: returns non-empty script containing singularity', () => {
    const script = generateCompletionScript('zsh', names);
    expect(script.length).toBeGreaterThan(0);
    expect(script).toContain('singularity');
  });

  it('fish: returns non-empty script containing singularity', () => {
    const script = generateCompletionScript('fish', names);
    expect(script.length).toBeGreaterThan(0);
    expect(script).toContain('singularity');
  });

  it('powershell: throws ValidationFailedError', () => {
    expect(() => generateCompletionScript('powershell', names)).toThrow(ValidationFailedError);
  });

  it('unsupported shell: error has field:shell detail', () => {
    let err: ValidationFailedError | null = null;
    try {
      generateCompletionScript('ksh', names);
    } catch (e) {
      err = e as ValidationFailedError;
    }
    expect(err?.code).toBe('VALIDATION_FAILED');
    expect(err?.details?.field).toBe('shell');
  });
});

describe('buildUpdateTagPayload', () => {
  it('throws ValidationFailedError when no fields given', () => {
    expect(() => buildUpdateTagPayload('t1', {})).toThrow(ValidationFailedError);
  });

  it('title-only yields {id, title}', () => {
    const payload = buildUpdateTagPayload('t1', { title: 'urgent' });
    expect(payload).toEqual({ id: 't1', title: 'urgent' });
  });

  it('includes only provided fields plus id', () => {
    const payload = buildUpdateTagPayload('t1', { title: 'A', color: 'red' });
    expect(Object.keys(payload).sort()).toEqual(['color', 'id', 'title']);
  });
});

describe('buildCreateTagPayload', () => {
  it('includes title', () => {
    const payload = buildCreateTagPayload({ title: 'focus' });
    expect(payload.title).toBe('focus');
    expect('color' in payload).toBe(false);
  });

  it('includes color when provided', () => {
    const payload = buildCreateTagPayload({ title: 'focus', color: 'blue' });
    expect(payload.color).toBe('blue');
  });
});

describe('buildUpdateTaskGroupPayload', () => {
  it('throws ValidationFailedError when no fields given', () => {
    expect(() => buildUpdateTaskGroupPayload('g1', {})).toThrow(ValidationFailedError);
  });

  it('title-only yields {id, title}', () => {
    const payload = buildUpdateTaskGroupPayload('g1', { title: 'Week 2' });
    expect(payload).toEqual({ id: 'g1', title: 'Week 2' });
  });

  it('includes only provided fields plus id', () => {
    const payload = buildUpdateTaskGroupPayload('g1', { title: 'T', color: 'blue' });
    expect(Object.keys(payload).sort()).toEqual(['color', 'id', 'title']);
  });
});

describe('buildCreateTaskGroupPayload', () => {
  it('includes title and projectId', () => {
    const payload = buildCreateTaskGroupPayload({ title: 'Sprint 1', project: 'proj-1' });
    expect(payload.title).toBe('Sprint 1');
    expect(payload.projectId).toBe('proj-1');
  });

  it('includes color when provided', () => {
    const payload = buildCreateTaskGroupPayload({ title: 'S1', project: 'p1', color: 'green' });
    expect(payload.color).toBe('green');
  });
});

describe('SDK import smoke', () => {
  it('exposes createSingularityAdapter, allSchemas, CliError', async () => {
    const sdk = await import('../../src/sdk/index.js');
    expect(typeof sdk.createSingularityAdapter).toBe('function');
    expect(typeof sdk.allSchemas).toBe('function');
    expect(typeof sdk.CliError).toBe('function');
  });

  it('allSchemas() returns a non-empty object', async () => {
    const { allSchemas } = await import('../../src/sdk/index.js');
    const schemas = allSchemas();
    expect(typeof schemas).toBe('object');
    expect(Object.keys(schemas).length).toBeGreaterThan(0);
  });
});
