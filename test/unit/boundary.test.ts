import { readFile } from 'node:fs/promises';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('adapter boundary', () => {
  it('allows only paths.ts and adapter.ts to mention upstream/extracted', async () => {
    const files = globSync('src/**/*.ts');
    const allowed = new Set<string>([]);

    const offenders: string[] = [];
    for (const file of files) {
      const content = await readFile(file, 'utf8');
      if (content.includes('upstream/extracted') && !allowed.has(file)) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });
});
