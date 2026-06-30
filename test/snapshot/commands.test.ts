import { describe, expect, it } from 'vitest';
import { commandMetadata } from '../../src/commands/registry.js';

describe('commandMetadata snapshot', () => {
  it('sorted commandMetadata matches snapshot', () => {
    const sorted = [...commandMetadata].sort((a, b) => a.name.localeCompare(b.name));
    expect(sorted).toMatchSnapshot();
  });

  it('includes commands from all expected groups', () => {
    const names = commandMetadata.map((m) => m.name);
    const prefixes = ['tasks', 'projects', 'auth', 'upstream', 'version', 'commands', 'schemas', 'skills', 'config'];
    for (const prefix of prefixes) {
      expect(names.some((n) => n === prefix || n.startsWith(`${prefix} `))).toBe(true);
    }
  });
});
