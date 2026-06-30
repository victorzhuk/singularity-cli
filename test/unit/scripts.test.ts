import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, it, expect } from 'vitest';

describe('npm scripts wire upstream subcommands', () => {
  let scripts: Record<string, string>;

  beforeAll(async () => {
    const raw = await readFile(path.join(process.cwd(), 'package.json'), 'utf8');
    scripts = (JSON.parse(raw) as { scripts: Record<string, string> }).scripts;
  });

  it('upstream:check delegates to upstream check', () => {
    expect(scripts['upstream:check']).toContain('upstream check');
  });

  it('upstream:upgrade delegates to upstream upgrade', () => {
    expect(scripts['upstream:upgrade']).toContain('upstream upgrade');
  });

  it('upstream:verify delegates to upstream verify', () => {
    expect(scripts['upstream:verify']).toContain('upstream verify');
  });
});
