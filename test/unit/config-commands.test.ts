import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse as yamlParse } from 'yaml';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promisify } from 'node:util';
import { buildInitConfig, isValidTimezone } from '../../src/commands/config.js';

const exec = promisify(execFile);

const repoRoot = process.cwd();
const cliBin = path.join(repoRoot, 'dist', 'cli.js');

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCli(
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<RunResult> {
  try {
    const { stdout, stderr } = await exec('node', [cliBin, ...args], {
      cwd: opts.cwd ?? repoRoot,
      env: opts.env ?? process.env,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', exitCode: e.code ?? 1 };
  }
}

function parseStderr(stderr: string): { code: string; message: string } {
  const parsed = JSON.parse(stderr.trim());
  return parsed.error as { code: string; message: string };
}

const minimalConfig = `version: 1\nprofiles: {}\nprojects: {}\n`;

const minimalConfigWithProfile = `\
version: 1
profiles:
  default:
    tokenEnv: SINGULARITY_REFRESH_TOKEN
    timezone: GMT+0
projects: {}
`;

describe('isValidTimezone', () => {
  it('accepts UTC and GMT', () => {
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('GMT')).toBe(true);
  });

  it('accepts GMT offsets', () => {
    expect(isValidTimezone('GMT+3')).toBe(true);
    expect(isValidTimezone('GMT-5')).toBe(true);
    expect(isValidTimezone('GMT+12')).toBe(true);
    expect(isValidTimezone('GMT+0')).toBe(true);
  });

  it('accepts IANA-like strings', () => {
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('Europe/London')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidTimezone('')).toBe(false);
  });

  it('rejects obviously invalid strings', () => {
    expect(isValidTimezone('not a timezone')).toBe(false);
    expect(isValidTimezone('123')).toBe(false);
    expect(isValidTimezone('+05:30')).toBe(false);
  });
});

describe('buildInitConfig', () => {
  it('builds a valid config shape', () => {
    const cfg = buildInitConfig({
      project: 'myproj',
      profile: 'default',
      tokenEnv: 'SINGULARITY_REFRESH_TOKEN',
      timezone: 'GMT+0',
    });
    expect(cfg.version).toBe(1);
    expect(cfg.defaultProject).toBe('myproj');
    expect(cfg.profiles['default'].tokenEnv).toBe('SINGULARITY_REFRESH_TOKEN');
    expect(cfg.profiles['default'].timezone).toBe('GMT+0');
    expect(cfg.projects).toEqual({});
  });

  it('includes apiUrl when provided', () => {
    const cfg = buildInitConfig({
      project: 'p',
      profile: 'default',
      tokenEnv: 'MY_TOKEN',
      timezone: 'UTC',
      apiUrl: 'https://custom.api.example.com',
    });
    expect(cfg.profiles['default'].apiUrl).toBe('https://custom.api.example.com');
  });

  it('omits apiUrl when not provided', () => {
    const cfg = buildInitConfig({
      project: 'p',
      profile: 'default',
      tokenEnv: 'T',
      timezone: 'UTC',
    });
    expect('apiUrl' in cfg.profiles['default']).toBe(false);
  });
});

describe('config validate (CLI)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'sg-cfg-validate-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('happy path with valid config → valid:true report', async () => {
    writeFileSync(path.join(tempDir, '.singularity-project.yml'), minimalConfigWithProfile, 'utf8');

    const result = await runCli(
      ['config', 'validate', '--json', '--cwd', tempDir],
      {
        env: {
          ...process.env,
          SINGULARITY_REFRESH_TOKEN: 'test-token-abc',
          REFRESH_TOKEN: '',
        },
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const report = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(report.valid).toBe(true);
    expect(typeof report.configPath).toBe('string');
    expect((report.configPath as string).endsWith('.singularity-project.yml')).toBe(true);
    expect(Array.isArray(report.profiles)).toBe(true);
    expect(Array.isArray(report.projectAliases)).toBe(true);
    expect(typeof report.tokenAvailable).toBe('boolean');
    expect(report.defaultProfile).toBeNull();
    expect(report.defaultProject).toBeNull();
  });

  it('tokenAvailable:false when no token env set', async () => {
    writeFileSync(path.join(tempDir, '.singularity-project.yml'), minimalConfig, 'utf8');

    const env: NodeJS.ProcessEnv = { ...process.env };
    delete env['SINGULARITY_REFRESH_TOKEN'];
    delete env['REFRESH_TOKEN'];

    const result = await runCli(
      ['config', 'validate', '--json', '--cwd', tempDir],
      { env },
    );

    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(report.tokenAvailable).toBe(false);
  });

  it('tokenAvailable:true when token env is set', async () => {
    writeFileSync(path.join(tempDir, '.singularity-project.yml'), minimalConfig, 'utf8');

    const result = await runCli(
      ['config', 'validate', '--json', '--cwd', tempDir],
      {
        env: { ...process.env, SINGULARITY_REFRESH_TOKEN: 'tok', REFRESH_TOKEN: '' },
      },
    );

    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(report.tokenAvailable).toBe(true);
  });

  it('no config file → valid:true with nulls', async () => {
    const result = await runCli(
      ['config', 'validate', '--json', '--cwd', tempDir],
      {
        env: { ...process.env, SINGULARITY_REFRESH_TOKEN: '', REFRESH_TOKEN: '' },
      },
    );

    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(report.valid).toBe(true);
    expect(report.configPath).toBeNull();
    expect(report.profiles).toEqual([]);
    expect(report.projectAliases).toEqual([]);
  });

  it('invalid YAML → CONFIG_INVALID', async () => {
    writeFileSync(path.join(tempDir, '.singularity-project.yml'), ': bad: yaml: {{', 'utf8');

    const result = await runCli(
      ['config', 'validate', '--json', '--cwd', tempDir],
    );

    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(parseStderr(result.stderr).code).toBe('CONFIG_INVALID');
  });

  it('unknown version → CONFIG_INVALID', async () => {
    writeFileSync(
      path.join(tempDir, '.singularity-project.yml'),
      'version: 999\nprofiles: {}\nprojects: {}\n',
      'utf8',
    );

    const result = await runCli(
      ['config', 'validate', '--json', '--cwd', tempDir],
    );

    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(parseStderr(result.stderr).code).toBe('CONFIG_INVALID');
  });

  it('invalid timezone in profile → CONFIG_INVALID', async () => {
    const yaml = `version: 1\nprofiles:\n  bad:\n    timezone: "not a tz"\nprojects: {}\n`;
    writeFileSync(path.join(tempDir, '.singularity-project.yml'), yaml, 'utf8');

    const result = await runCli(
      ['config', 'validate', '--json', '--cwd', tempDir],
    );

    expect(result.exitCode).not.toBe(0);
    expect(parseStderr(result.stderr).code).toBe('CONFIG_INVALID');
  });
});

describe('config init (CLI)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'sg-cfg-init-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('--json without --project → VALIDATION_FAILED, no file written', async () => {
    const result = await runCli(
      ['config', 'init', '--json', '--cwd', tempDir],
    );

    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(parseStderr(result.stderr).code).toBe('VALIDATION_FAILED');
    expect(existsSync(path.join(tempDir, '.singularity-project.yml'))).toBe(false);
  });

  it('--json --project myproj → writes valid config with defaults', async () => {
    const result = await runCli(
      ['config', 'init', '--json', '--project', 'myproj', '--cwd', tempDir],
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    const out = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(out.created).toBe(true);
    expect(out.version).toBe(1);
    expect(out.profile).toBe('default');
    expect(out.project).toBe('myproj');
    expect(typeof out.path).toBe('string');

    const written = path.join(tempDir, '.singularity-project.yml');
    expect(existsSync(written)).toBe(true);

    const parsed = yamlParse(readFileSync(written, 'utf8')) as Record<string, unknown>;
    expect(parsed['version']).toBe(1);
    expect(parsed['defaultProject']).toBe('myproj');

    const profiles = parsed['profiles'] as Record<string, Record<string, unknown>>;
    expect(profiles['default']['tokenEnv']).toBe('SINGULARITY_REFRESH_TOKEN');
    expect(profiles['default']['timezone']).toBe('GMT+0');
    expect('token' in profiles['default']).toBe(false);

    const raw = readFileSync(written, 'utf8');
    expect(raw).not.toMatch(/token:/);
  });

  it('second run without --force → VALIDATION_FAILED', async () => {
    await runCli(['config', 'init', '--json', '--project', 'myproj', '--cwd', tempDir]);

    const result = await runCli(
      ['config', 'init', '--json', '--project', 'myproj', '--cwd', tempDir],
    );

    expect(result.exitCode).not.toBe(0);
    expect(parseStderr(result.stderr).code).toBe('VALIDATION_FAILED');
  });

  it('second run with --force → succeeds', async () => {
    await runCli(['config', 'init', '--json', '--project', 'p1', '--cwd', tempDir]);

    const result = await runCli(
      ['config', 'init', '--json', '--project', 'p2', '--force', '--cwd', tempDir],
    );

    expect(result.exitCode).toBe(0);
    const out = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(out.created).toBe(true);
    expect(out.project).toBe('p2');
  });

  it('custom flags are recorded in the file', async () => {
    const result = await runCli([
      'config', 'init', '--json',
      '--project', 'proj',
      '--profile', 'staging',
      '--token-env', 'MY_TOKEN',
      '--timezone', 'Europe/London',
      '--cwd', tempDir,
    ]);

    expect(result.exitCode).toBe(0);
    const written = path.join(tempDir, '.singularity-project.yml');
    const parsed = yamlParse(readFileSync(written, 'utf8')) as Record<string, unknown>;
    const profiles = parsed['profiles'] as Record<string, Record<string, unknown>>;
    expect(profiles['staging']['tokenEnv']).toBe('MY_TOKEN');
    expect(profiles['staging']['timezone']).toBe('Europe/London');
  });
});
