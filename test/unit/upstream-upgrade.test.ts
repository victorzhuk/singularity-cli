import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { archivePath } from '../../src/upstream/paths.js';

const exec = promisify(execFile);

// ---------------------------------------------------------------------------
// Mocks for happy-path unit test (only active in the test process;
// integration tests use execFile subprocesses and are unaffected).
// ---------------------------------------------------------------------------

const MOCK_SHA = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
const MOCK_DISCOVERY = {
  requiredFiles: ['client.js', 'package.json'],
  client: { functions: ['listTasks', 'getTask'] },
  modules: {},
  adapterMap: {},
};

vi.mock('../../src/upstream/hash.js', () => ({
  sha256File: vi.fn().mockResolvedValue(MOCK_SHA),
}));

vi.mock('../../src/upstream/extract.js', () => ({
  extractArchive: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/upstream/upgrade.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/upstream/upgrade.js')>();
  return {
    ...actual,
    downloadArchive: vi.fn().mockImplementation(async (_url: string, dest: string) => {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(dest, Buffer.alloc(0));
    }),
    validateCandidate: vi.fn().mockResolvedValue(MOCK_DISCOVERY),
  };
});

vi.mock('../../src/upstream/lockfile.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/upstream/lockfile.js')>();
  return {
    ...actual,
    readLockfile: vi.fn().mockResolvedValue({
      version: '2.1.0',
      sha256: 'oldhash000000000000000000000000000000000000000000000000000000000',
      sourceUrl: 'https://example.com/releases/2.1.0/bundle.mcpb',
      downloadedAt: '2026-01-01T00:00:00.000Z',
      requiredFiles: ['client.js'],
      discoveredModules: { client: { functions: [] }, modules: {} },
      adapterMap: {},
    }),
  };
});

// ---------------------------------------------------------------------------
// Integration tests (run via subprocess — mocks above do NOT affect them)
// ---------------------------------------------------------------------------

let tmpDir: string;
let tmpArchive: string;
let tmpLockfile: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), 'singularity-upgrade-'));
  tmpArchive = path.join(tmpDir, 'bundle.mcpb');
  tmpLockfile = path.join(tmpDir, 'lock.json');

  await copyFile(archivePath, tmpArchive);
  await copyFile(path.join(process.cwd(), 'upstream-lock.json'), tmpLockfile);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

async function runUpgrade(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await exec(
      'node',
      ['dist/cli.js', 'upstream', 'upgrade', ...args],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          SINGULARITY_UPSTREAM_ARCHIVE: tmpArchive,
          SINGULARITY_UPSTREAM_LOCKFILE: tmpLockfile,
        },
      },
    );
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: e.code ?? 1,
    };
  }
}

describe('upstream upgrade safe-failure invariant', () => {
  it('leaves archive and lockfile byte-identical when download fails', async () => {
    const archiveBefore = await readFile(tmpArchive);
    const lockBefore = await readFile(tmpLockfile, 'utf8');

    const result = await runUpgrade([
      '--to',
      'http://127.0.0.1:59999/nope.mcpb',
      '--json',
    ]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('UPSTREAM_BREAKING_CHANGE');

    const archiveAfter = await readFile(tmpArchive);
    const lockAfter = await readFile(tmpLockfile, 'utf8');

    expect(archiveAfter.equals(archiveBefore)).toBe(true);
    expect(lockAfter).toBe(lockBefore);
  }, 30_000);

  it('fails with USAGE_ERROR when --to is omitted', async () => {
    const result = await runUpgrade(['--json']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('USAGE_ERROR');
  });

  it('upstream:upgrade script wiring includes the upgrade subcommand', async () => {
    const pkg = JSON.parse(
      await readFile(path.join(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.['upstream:upgrade']).toContain('upstream upgrade');
  });
});

// ---------------------------------------------------------------------------
// Happy-path unit test (uses mocks above; imports source directly)
// ---------------------------------------------------------------------------

describe('upstream upgrade happy path', () => {
  it('writes correct lockfile and prints all next-step commands', async () => {
    // Use tmpArchive and tmpLockfile from the outer beforeEach (real files).
    // downloadArchive mock creates an empty file at its dest so rename() succeeds.
    // writeFile/rename run for real; we read tmpLockfile afterward.
    process.env['SINGULARITY_UPSTREAM_ARCHIVE'] = tmpArchive;
    process.env['SINGULARITY_UPSTREAM_LOCKFILE'] = tmpLockfile;

    const stdoutChunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: string | Uint8Array) => {
      stdoutChunks.push(String(chunk));
      return true;
    };

    try {
      const { createUpstreamCommand } = await import('../../src/commands/upstream.js');
      const cmd = createUpstreamCommand();
      const upgradeSubCmd = cmd.commands.find(c => c.name() === 'upgrade');
      if (!upgradeSubCmd) throw new Error('upgrade subcommand not found');

      upgradeSubCmd.exitOverride();
      await upgradeSubCmd.parseAsync(['--to', '2.2.0', '--json'], { from: 'user' });
    } finally {
      process.stdout.write = origWrite;
      delete process.env['SINGULARITY_UPSTREAM_ARCHIVE'];
      delete process.env['SINGULARITY_UPSTREAM_LOCKFILE'];
    }

    const stdout = stdoutChunks.join('');
    const parsed = JSON.parse(stdout) as Record<string, unknown>;

    expect(parsed['version']).toBe('2.2.0');
    expect(parsed['sha256']).toBe(MOCK_SHA);
    expect(parsed['upgraded']).toBe(true);

    const nextSteps = parsed['nextSteps'] as string[];
    expect(nextSteps).toContain('npm run test:snapshot');
    expect(nextSteps).toContain('npm test');
    expect(nextSteps).toContain('npm run upstream:verify');
    expect(nextSteps).toContain('npm run typecheck');
    expect(nextSteps).toContain('npm run lint');

    // Verify lockfile was updated on disk
    const lock = JSON.parse(await readFile(tmpLockfile, 'utf8')) as Record<string, unknown>;
    expect(lock['version']).toBe('2.2.0');
    expect(lock['sha256']).toBe(MOCK_SHA);
    expect(typeof lock['sourceUrl']).toBe('string');
    expect(String(lock['sourceUrl'])).toContain('2.2.0');
  });
});
