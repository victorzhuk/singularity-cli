import { describe, expect, it } from 'vitest';
import {
  AdapterUnavailableError,
  AuthFailedError,
  AuthScopeDeniedError,
  AuthTokenExpiredError,
  AuthTokenInvalidError,
  AuthTokenMissingError,
  BaseTaskGroupMissingError,
  CliError,
  ConfirmationRequiredError,
  ConfigInvalidError,
  DeltaInvalidError,
  GeneratedFileCollisionError,
  InternalError,
  NetworkTimeoutError,
  NotImplementedError,
  ProfileUnknownError,
  ProjectAliasUnknownError,
  ProjectBindingMissingError,
  UnsupportedDryRunError,
  UpstreamBreakingChangeError,
  UpstreamSchemaMismatchError,
  UsageError,
  ValidationFailedError,
  formatErrorEnvelope,
} from '../../src/core/errors.js';

function buildEnvelopeMap(): Record<string, unknown> {
  const errors: CliError[] = [
    new AdapterUnavailableError('adapter not loaded'),
    new AuthFailedError('authentication failed'),
    new AuthScopeDeniedError('scope denied'),
    new AuthTokenExpiredError('token expired'),
    new AuthTokenInvalidError('token invalid'),
    new AuthTokenMissingError('no token provided'),
    new BaseTaskGroupMissingError('base task group missing', { project: 'proj-1' }),
    new ConfirmationRequiredError('confirmation required', { flag: '--yes' }),
    new ConfigInvalidError('config parse error', { path: '/path/to/config.yml' }),
    new DeltaInvalidError('final op must end with \\n'),
    new GeneratedFileCollisionError('file already exists', { path: 'SKILL.md' }),
    new InternalError('unexpected error'),
    new NetworkTimeoutError(5000, { operation: 'listTasks' }),
    new NotImplementedError('tasks complete'),
    new ProfileUnknownError('unknown profile: prod', { knownProfiles: ['default'] }),
    new ProjectAliasUnknownError('unknown alias: foo', { knownAliases: ['bar', 'baz'] }),
    new ProjectBindingMissingError('no project configured'),
    new UnsupportedDryRunError('dry-run not supported for delete'),
    new UpstreamBreakingChangeError('required method missing', { missing: ['createTask'] }),
    new UpstreamSchemaMismatchError('id field missing', { command: 'tasks get', missingFields: ['id'] }),
    new UsageError('unknown option: --nope'),
    new ValidationFailedError('title required', { fields: ['title'] }),
  ];

  const map: Record<string, unknown> = {};
  for (const err of errors) {
    map[err.code] = formatErrorEnvelope(err);
  }
  return map;
}

describe('error envelope snapshots', () => {
  it('all 22 envelopes match snapshot', () => {
    expect(buildEnvelopeMap()).toMatchSnapshot();
  });

  it('every envelope has a string code and message', () => {
    const map = buildEnvelopeMap();
    for (const [code, raw] of Object.entries(map)) {
      const env = raw as { error: { code: string; message: string; details?: unknown } };
      expect(env.error.code).toBe(code);
      expect(typeof env.error.message).toBe('string');
    }
  });

  it('no envelope details contain a stack trace or token', () => {
    const map = buildEnvelopeMap();
    const serialized = JSON.stringify(map);
    expect(serialized).not.toMatch(/at\s+\w+\s+\(/);
    expect(serialized).not.toContain('Authorization');
  });
});
