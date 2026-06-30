import { describe, it, expect } from 'vitest';
import {
  buildNotePayload,
  buildAddItemPayload,
  buildNotebookPayload,
} from '../../src/commands/notes.js';
import {
  HABIT_COLORS,
  validateHabitColor,
  buildCreateHabitPayload,
  buildUpdateHabitPayload,
} from '../../src/commands/habits.js';
import { validateDelta } from '../../src/core/validators.js';
import { DeltaInvalidError, ValidationFailedError } from '../../src/core/errors.js';

describe('validateDelta', () => {
  it('accepts a bare ops array with trailing \\n insert', () => {
    expect(() => validateDelta([{ insert: 'hello\n' }])).not.toThrow();
  });

  it('accepts multiple ops when last insert ends with \\n', () => {
    expect(() =>
      validateDelta([{ insert: 'line one' }, { insert: '\n' }]),
    ).not.toThrow();
  });

  it('rejects {ops:[...]} wrapper', () => {
    expect(() => validateDelta({ ops: [{ insert: 'hi\n' }] })).toThrow(DeltaInvalidError);
  });

  it('rejects empty array', () => {
    expect(() => validateDelta([])).toThrow(DeltaInvalidError);
  });

  it('rejects when final insert does not end with \\n', () => {
    expect(() => validateDelta([{ insert: 'no newline' }])).toThrow(DeltaInvalidError);
  });

  it('rejects non-array values', () => {
    expect(() => validateDelta('not an array')).toThrow(DeltaInvalidError);
    expect(() => validateDelta(42)).toThrow(DeltaInvalidError);
    expect(() => validateDelta(null)).toThrow(DeltaInvalidError);
  });
});

describe('buildNotePayload', () => {
  it('parses content and passes validation', () => {
    const payload = buildNotePayload({
      content: '[{"insert":"hello\\n"}]',
    });
    expect(payload.content).toEqual([{ insert: 'hello\n' }]);
  });

  it('includes title and projectId when provided', () => {
    const payload = buildNotePayload({
      content: '[{"insert":"hi\\n"}]',
      title: 'My Note',
      projectId: 'proj-1',
    });
    expect(payload.title).toBe('My Note');
    expect(payload.projectId).toBe('proj-1');
  });

  it('omits title and projectId when not provided', () => {
    const payload = buildNotePayload({ content: '[{"insert":"hi\\n"}]' });
    expect('title' in payload).toBe(false);
    expect('projectId' in payload).toBe(false);
  });

  it('throws DeltaInvalidError for invalid JSON', () => {
    expect(() => buildNotePayload({ content: 'not-json' })).toThrow(DeltaInvalidError);
  });

  it('throws DeltaInvalidError for {ops:[...]} wrapper', () => {
    expect(() =>
      buildNotePayload({ content: '{"ops":[{"insert":"hi\\n"}]}' }),
    ).toThrow(DeltaInvalidError);
  });

  it('throws DeltaInvalidError when trailing \\n is missing', () => {
    expect(() =>
      buildNotePayload({ content: '[{"insert":"no newline"}]' }),
    ).toThrow(DeltaInvalidError);
  });
});

describe('buildAddItemPayload', () => {
  it('sets isNote:true by default', () => {
    const payload = buildAddItemPayload({ title: 'My Item', projectId: 'p1' });
    expect(payload.isNote).toBe(true);
    expect(payload.title).toBe('My Item');
    expect(payload.projectId).toBe('p1');
  });

  it('omits isNote when --task is true', () => {
    const payload = buildAddItemPayload({ title: 'My Task', projectId: 'p1', task: true });
    expect('isNote' in payload).toBe(false);
    expect(payload.title).toBe('My Task');
  });

  it('sets isNote:true when task is explicitly false', () => {
    const payload = buildAddItemPayload({ title: 'Note', projectId: 'p1', task: false });
    expect(payload.isNote).toBe(true);
  });
});

describe('buildNotebookPayload', () => {
  it('returns name and notebook:true', () => {
    const payload = buildNotebookPayload('My Notebook');
    expect(payload).toEqual({ name: 'My Notebook', notebook: true });
  });
});

describe('HABIT_COLORS', () => {
  it('is a non-empty readonly array of strings', () => {
    expect(Array.isArray(HABIT_COLORS)).toBe(true);
    expect(HABIT_COLORS.length).toBeGreaterThan(0);
    for (const c of HABIT_COLORS) {
      expect(typeof c).toBe('string');
    }
  });

  it('does not include hex codes', () => {
    for (const c of HABIT_COLORS) {
      expect(c).not.toMatch(/^#/);
      expect(c).not.toMatch(/^[0-9a-fA-F]{3,6}$/);
    }
  });
});

describe('validateHabitColor', () => {
  it('accepts each valid color name', () => {
    for (const color of HABIT_COLORS) {
      expect(() => validateHabitColor(color)).not.toThrow();
    }
  });

  it('rejects hex color codes with ValidationFailedError', () => {
    expect(() => validateHabitColor('#ff0000')).toThrow(ValidationFailedError);
  });

  it('rejects bare hex strings', () => {
    expect(() => validateHabitColor('ff0000')).toThrow(ValidationFailedError);
  });

  it('rejects unknown color names', () => {
    expect(() => validateHabitColor('chartreuse')).toThrow(ValidationFailedError);
  });

  it('includes allowedColors in error details', () => {
    let err: ValidationFailedError | null = null;
    try {
      validateHabitColor('unknown');
    } catch (e) {
      err = e as ValidationFailedError;
    }
    expect(err).not.toBeNull();
    expect(err?.details?.allowedColors).toEqual(HABIT_COLORS);
  });
});

describe('buildCreateHabitPayload', () => {
  it('defaults status to 0 when not given', () => {
    const payload = buildCreateHabitPayload({ title: 'Read' });
    expect(payload.status).toBe(0);
    expect(payload.title).toBe('Read');
  });

  it('uses provided status', () => {
    const payload = buildCreateHabitPayload({ title: 'Read', status: 1 });
    expect(payload.status).toBe(1);
  });

  it('includes color when valid', () => {
    const payload = buildCreateHabitPayload({ title: 'Read', color: 'blue' });
    expect(payload.color).toBe('blue');
  });

  it('omits color when not provided', () => {
    const payload = buildCreateHabitPayload({ title: 'Read' });
    expect('color' in payload).toBe(false);
  });

  it('throws ValidationFailedError for invalid color', () => {
    expect(() => buildCreateHabitPayload({ title: 'Read', color: '#abc' })).toThrow(
      ValidationFailedError,
    );
  });
});

describe('buildUpdateHabitPayload', () => {
  it('throws ValidationFailedError when no fields given', () => {
    expect(() => buildUpdateHabitPayload('h1', {})).toThrow(ValidationFailedError);
  });

  it('title-only yields {id, title}', () => {
    const payload = buildUpdateHabitPayload('h1', { title: 'New' });
    expect(payload).toEqual({ id: 'h1', title: 'New' });
  });

  it('includes only provided fields plus id', () => {
    const payload = buildUpdateHabitPayload('h1', { title: 'T', color: 'red' });
    expect(Object.keys(payload).sort()).toEqual(['color', 'id', 'title']);
  });

  it('validates color before building payload', () => {
    expect(() => buildUpdateHabitPayload('h1', { color: 'hotpink' })).toThrow(
      ValidationFailedError,
    );
  });

  it('includes allowedColors in error details for bad color', () => {
    let err: ValidationFailedError | null = null;
    try {
      buildUpdateHabitPayload('h1', { color: 'ff0000' });
    } catch (e) {
      err = e as ValidationFailedError;
    }
    expect(err?.details?.allowedColors).toEqual(HABIT_COLORS);
  });
});
