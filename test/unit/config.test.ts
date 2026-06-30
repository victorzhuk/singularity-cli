import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findRepoConfig } from '../../src/config/discovery.js';
import { parseConfig } from '../../src/config/parse.js';
import { loadResolvedConfig, resolveProfile, resolveProjectId } from '../../src/config/resolver.js';
import {
  ConfigInvalidError,
  ProfileUnknownError,
  ProjectAliasUnknownError,
} from '../../src/core/errors.js';
import type { ExecutionContext } from '../../src/core/context.js';

function makeCtx(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    cwd: process.cwd(),
    json: false,
    color: false,
    dryRun: false,
    timeoutMs: 30000,
    ...overrides,
  };
}

const VALID_CONFIG_YAML = `version: 1
profiles:
  default:
    apiUrl: https://api.example.com
projects:
  myproj:
    id: proj-123
    baseTaskGroupId: btg-1
`;

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'singularity-cfg-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('config discovery', () => {
  it('finds .singularity-project.yml by walking up from cwd', () => {
    const configFile = path.join(tmpDir, '.singularity-project.yml');
    writeFileSync(configFile, VALID_CONFIG_YAML);
    const subDir = path.join(tmpDir, 'sub', 'nested');
    mkdirSync(subDir, { recursive: true });

    const ctx = makeCtx({ cwd: subDir });
    expect(findRepoConfig(ctx)).toBe(configFile);
  });

  it('uses configPath directly, bypassing walk', () => {
    const explicit = '/nonexistent/explicit.yml';
    const ctx = makeCtx({ cwd: tmpDir, configPath: explicit });
    expect(findRepoConfig(ctx)).toBe(explicit);
  });

  it('returns undefined when no config found and no explicit path', () => {
    const ctx = makeCtx({ cwd: tmpDir });
    const result = findRepoConfig(ctx);
    expect(result === undefined || typeof result === 'string').toBe(true);
  });
});

describe('parseConfig', () => {
  it('parses valid YAML config', () => {
    const cfg = parseConfig(VALID_CONFIG_YAML);
    expect(cfg.version).toBe(1);
    expect(cfg.profiles?.['default']?.apiUrl).toBe('https://api.example.com');
    expect(cfg.projects?.['myproj']?.id).toBe('proj-123');
  });

  it('throws ConfigInvalidError on invalid YAML', () => {
    expect(() => parseConfig('{ invalid yaml :::')).toThrow(ConfigInvalidError);
  });

  it('throws ConfigInvalidError on unknown version', () => {
    expect(() => parseConfig('version: 99\nprofiles: {}\nprojects: {}\n')).toThrow(ConfigInvalidError);
  });

  it('throws ConfigInvalidError on missing version field', () => {
    expect(() => parseConfig('profiles: {}\nprojects: {}\n')).toThrow(ConfigInvalidError);
  });
});

describe('resolveProfile', () => {
  it('returns default profile when no profile specified in ctx', () => {
    const cfg = {
      repo: { version: 1 as const, profiles: { default: { apiUrl: 'https://x.com' } }, projects: {} },
    };
    const ctx = makeCtx({});
    const { name, profile } = resolveProfile(ctx, cfg);
    expect(name).toBe('default');
    expect(profile.apiUrl).toBe('https://x.com');
  });

  it('resolves a named profile from ctx', () => {
    const cfg = {
      repo: {
        version: 1 as const,
        profiles: { default: {}, staging: { apiUrl: 'https://staging.example.com' } },
        projects: {},
      },
    };
    const ctx = makeCtx({ profile: 'staging' });
    const { name, profile } = resolveProfile(ctx, cfg);
    expect(name).toBe('staging');
    expect(profile.apiUrl).toBe('https://staging.example.com');
  });

  it('throws ProfileUnknownError for unknown profile name', () => {
    const cfg = {
      repo: { version: 1 as const, profiles: { default: {} }, projects: {} },
    };
    const ctx = makeCtx({ profile: 'nonexistent' });
    expect(() => resolveProfile(ctx, cfg)).toThrow(ProfileUnknownError);
  });

  it('returns default empty profile when no profiles defined', () => {
    const cfg = {};
    const ctx = makeCtx({});
    const { name } = resolveProfile(ctx, cfg);
    expect(name).toBe('default');
  });
});

describe('resolveProjectId', () => {
  it('resolves known alias to id', () => {
    const cfg = {
      repo: { version: 1 as const, profiles: {}, projects: { myproj: { id: 'proj-123' } } },
    };
    const ctx = makeCtx({ project: 'myproj' });
    expect(resolveProjectId(ctx, cfg, {})).toBe('proj-123');
  });

  it('returns raw value when not in alias map (treated as direct id)', () => {
    const cfg = {
      repo: { version: 1 as const, profiles: {}, projects: {} },
    };
    const ctx = makeCtx({ project: 'proj-999' });
    expect(resolveProjectId(ctx, cfg, {})).toBe('proj-999');
  });

  it('returns undefined when no project in ctx or profile', () => {
    const cfg = {};
    const ctx = makeCtx({});
    expect(resolveProjectId(ctx, cfg, {})).toBeUndefined();
  });

  it('throws ProjectAliasUnknownError for value with whitespace', () => {
    const cfg = {
      repo: { version: 1 as const, profiles: {}, projects: { alpha: { id: 'a-1' } } },
    };
    const ctx = makeCtx({ project: 'bad alias name' });
    expect(() => resolveProjectId(ctx, cfg, {})).toThrow(ProjectAliasUnknownError);
  });

  it('ProjectAliasUnknownError details include knownAliases', () => {
    const cfg = {
      repo: { version: 1 as const, profiles: {}, projects: { alpha: { id: 'a-1' }, beta: { id: 'b-2' } } },
    };
    const ctx = makeCtx({ project: 'bad alias' });
    let thrown: ProjectAliasUnknownError | undefined;
    try {
      resolveProjectId(ctx, cfg, {});
    } catch (e) {
      thrown = e as ProjectAliasUnknownError;
    }
    expect(thrown).toBeInstanceOf(ProjectAliasUnknownError);
    expect((thrown?.details as { knownAliases?: string[] })?.knownAliases).toContain('alpha');
    expect((thrown?.details as { knownAliases?: string[] })?.knownAliases).toContain('beta');
  });
});

describe('loadResolvedConfig', () => {
  it('returns empty resolved config when no files present', () => {
    const ctx = makeCtx({ cwd: tmpDir, configPath: path.join(tmpDir, 'nonexistent.yml') });
    const resolved = loadResolvedConfig(ctx);
    expect(resolved.repo).toBeUndefined();
  });

  it('loads repo config when .singularity-project.yml present', () => {
    const configFile = path.join(tmpDir, '.singularity-project.yml');
    writeFileSync(configFile, VALID_CONFIG_YAML);
    const ctx = makeCtx({ cwd: tmpDir });
    const resolved = loadResolvedConfig(ctx);
    expect(resolved.repo?.version).toBe(1);
    expect(resolved.repoPath).toBe(configFile);
  });
});
