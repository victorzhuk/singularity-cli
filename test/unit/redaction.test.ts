import { describe, expect, it } from 'vitest';
import { redact, registerSecret } from '../../src/core/redact.js';
import { renderSkill } from '../../src/skills/renderer.js';

describe('redact basics', () => {
  it('removes registered token from strings', () => {
    registerSecret('tok-abc-unique');
    expect(redact('Bearer tok-abc-unique')).toBe('Bearer [REDACTED]');
  });

  it('removes token from nested objects', () => {
    registerSecret('tok-nested-unique');
    expect(redact({ a: { b: 'tok-nested-unique' } })).toEqual({ a: { b: '[REDACTED]' } });
  });

  it('removes token from arrays', () => {
    registerSecret('tok-arr-unique');
    expect(redact(['tok-arr-unique', 'safe'])).toEqual(['[REDACTED]', 'safe']);
  });

  it('replaces all occurrences within a string', () => {
    registerSecret('tok-multi');
    expect(redact('tok-multi and tok-multi again')).toBe('[REDACTED] and [REDACTED] again');
  });

  it('passes through non-string primitives unchanged', () => {
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
    expect(redact(true)).toBe(true);
    expect(redact(false)).toBe(false);
  });

  it('passes through undefined unchanged', () => {
    expect(redact(undefined)).toBe(undefined);
  });
});

describe('rendered skill does not leak registered secrets', () => {
  it('skill content does not contain a registered secret', async () => {
    registerSecret('SKILL-SECRET-TOKEN-XYZ-UNIQUE');
    const { content } = await renderSkill();
    expect(content).not.toContain('SKILL-SECRET-TOKEN-XYZ-UNIQUE');
  });
});
