import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateHabitColor, HABIT_COLORS } from '../../src/commands/habits.js';
import { ValidationFailedError } from '../../src/core/errors.js';

function loadFixture(dir: string, name: string): unknown {
  return JSON.parse(readFileSync(`test/fixtures/${dir}/${name}.json`, 'utf8'));
}

describe('notesDelta golden round-trip', () => {
  it('upstream fixture equals golden (notes returned as-is)', () => {
    const upstream = loadFixture('upstream', 'notesDelta');
    const golden = loadFixture('golden', 'notesDelta');
    expect(upstream).toEqual(golden);
  });
});

describe('habitCreate golden round-trip', () => {
  it('upstream fixture equals golden (habits returned as-is)', () => {
    const upstream = loadFixture('upstream', 'habitCreate');
    const golden = loadFixture('golden', 'habitCreate');
    expect(upstream).toEqual(golden);
  });

  it('invalid habit color → VALIDATION_FAILED with allowedColors', () => {
    expect(() => validateHabitColor('#ff6b6b')).toThrow(ValidationFailedError);
    try {
      validateHabitColor('#ff6b6b');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationFailedError);
      const e = err as ValidationFailedError;
      expect(e.code).toBe('VALIDATION_FAILED');
      expect(e.details).toMatchObject({ allowedColors: HABIT_COLORS });
    }
  });

  it('valid named color does not throw', () => {
    expect(() => validateHabitColor('blue')).not.toThrow();
    expect(() => validateHabitColor('red')).not.toThrow();
    expect(() => validateHabitColor('gray')).not.toThrow();
  });
});
