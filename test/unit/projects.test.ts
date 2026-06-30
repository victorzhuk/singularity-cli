import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { buildCreateProjectPayload, buildUpdateProjectPayload } from '../../src/commands/projects.js';
import { ValidationFailedError } from '../../src/core/errors.js';
import { validateEmoji } from '../../src/core/validators.js';

const exec = promisify(execFile);
const repoRoot = process.cwd();
const cliBin = path.join(repoRoot, 'dist', 'cli.js');

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCli(args: string[]): Promise<RunResult> {
  try {
    const { stdout, stderr } = await exec('node', [cliBin, ...args], {
      cwd: repoRoot,
      env: process.env,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', exitCode: e.code ?? 1 };
  }
}

describe('validateEmoji', () => {
  it('converts emoji char to lowercase hex codepoint', () => {
    expect(validateEmoji('🚀')).toBe('1f680');
  });

  it('passes through existing hex string lowercased', () => {
    expect(validateEmoji('1F680')).toBe('1f680');
  });

  it('passes through lowercase hex unchanged', () => {
    expect(validateEmoji('1f680')).toBe('1f680');
  });

  it('throws VALIDATION_FAILED for U+ notation (uppercase)', () => {
    expect(() => validateEmoji('U+1F680')).toThrow(ValidationFailedError);
  });

  it('throws VALIDATION_FAILED for u+ notation (lowercase)', () => {
    expect(() => validateEmoji('u+1f680')).toThrow(ValidationFailedError);
  });
});

describe('buildCreateProjectPayload', () => {
  it('maps title to name', () => {
    const p = buildCreateProjectPayload({ title: 'My Project' });
    expect(p.name).toBe('My Project');
  });

  it('omits showInBasket when not provided', () => {
    const p = buildCreateProjectPayload({ title: 'Test' });
    expect('showInBasket' in p).toBe(false);
  });

  it('includes showInBasket:true when flag is set', () => {
    const p = buildCreateProjectPayload({ title: 'Test', showInBasket: true });
    expect(p.showInBasket).toBe(true);
  });

  it('sets notebook when provided', () => {
    const p = buildCreateProjectPayload({ title: 'Test', notebook: true });
    expect(p.notebook).toBe(true);
  });

  it('omits notebook when not provided', () => {
    const p = buildCreateProjectPayload({ title: 'Test' });
    expect('notebook' in p).toBe(false);
  });

  it('converts emoji to hex', () => {
    const p = buildCreateProjectPayload({ title: 'Test', emoji: '🚀' });
    expect(p.emoji).toBe('1f680');
  });

  it('maps parent to parentId', () => {
    const p = buildCreateProjectPayload({ title: 'Child', parent: 'p-id' });
    expect(p.parentId).toBe('p-id');
  });

  it('includes description when provided', () => {
    const p = buildCreateProjectPayload({ title: 'T', description: 'desc' });
    expect(p.description).toBe('desc');
  });
});

describe('buildUpdateProjectPayload', () => {
  it('throws VALIDATION_FAILED for empty opts', () => {
    expect(() => buildUpdateProjectPayload('id', {})).toThrow(ValidationFailedError);
  });

  it('archive-only payload is exactly { id, archive: true }', () => {
    const p = buildUpdateProjectPayload('proj-id', { archive: true });
    expect(p).toEqual({ id: 'proj-id', archive: true });
  });

  it('unarchive payload is exactly { id, archive: false }', () => {
    const p = buildUpdateProjectPayload('proj-id', { archive: false });
    expect(p).toEqual({ id: 'proj-id', archive: false });
  });

  it('title-only payload maps to name', () => {
    const p = buildUpdateProjectPayload('proj-id', { title: 'New Name' });
    expect(p).toEqual({ id: 'proj-id', name: 'New Name' });
  });

  it('includes only provided fields', () => {
    const p = buildUpdateProjectPayload('proj-id', { title: 'T', archive: true });
    expect(Object.keys(p).sort()).toEqual(['archive', 'id', 'name']);
  });
});

describe('projects create --dry-run (CLI)', () => {
  it('returns dryRun plan with correct emoji, no showInBasket', async () => {
    const result = await runCli([
      'projects', 'create',
      '--title', 'X',
      '--emoji', '🚀',
      '--dry-run',
      '--json',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const out = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(out.dryRun).toBe(true);
    expect(out.operation).toBe('projects create');
    const payload = out.payload as Record<string, unknown>;
    expect(payload.emoji).toBe('1f680');
    expect('showInBasket' in payload).toBe(false);
    expect(payload.name).toBe('X');
  });
});

describe('projects update --dry-run (CLI)', () => {
  it('returns dryRun plan with updated fields', async () => {
    const result = await runCli([
      'projects', 'update',
      '--id', 'proj-id',
      '--title', 'New Title',
      '--dry-run',
      '--json',
    ]);
    expect(result.exitCode).toBe(0);
    const out = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(out.dryRun).toBe(true);
    expect(out.operation).toBe('projects update');
    const payload = out.payload as Record<string, unknown>;
    expect(payload.id).toBe('proj-id');
    expect(payload.name).toBe('New Title');
  });

  it('no updatable fields → VALIDATION_FAILED exit non-zero', async () => {
    const result = await runCli([
      'projects', 'update',
      '--id', 'proj-id',
      '--dry-run',
      '--json',
    ]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    const err = JSON.parse(result.stderr.trim()) as { error: { code: string } };
    expect(err.error.code).toBe('VALIDATION_FAILED');
  });
});
