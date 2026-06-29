import { describe, expect, it } from 'vitest';
import {
  AdapterUnavailableError,
  CliError,
  formatErrorEnvelope,
  InternalError,
  NetworkTimeoutError,
  NotImplementedError,
  UpstreamBreakingChangeError,
  UpstreamSchemaMismatchError,
  UsageError,
} from '../../src/core/errors.js';
import { redact, registerSecret } from '../../src/core/redact.js';

describe('error envelope', () => {
  it('formats a CliError into the envelope shape', () => {
    const error = new UpstreamBreakingChangeError('schema changed', {
      field: 'version',
    });
    expect(formatErrorEnvelope(error)).toEqual({
      error: {
        code: 'UPSTREAM_BREAKING_CHANGE',
        message: 'schema changed',
        details: { field: 'version' },
      },
    });
  });

  it('formats a base CliError', () => {
    const error = new CliError('NETWORK_TIMEOUT', 'timed out');
    expect(formatErrorEnvelope(error)).toEqual({
      error: {
        code: 'NETWORK_TIMEOUT',
        message: 'timed out',
      },
    });
  });

  it('omits details when empty', () => {
    const error = new AdapterUnavailableError('client missing');
    expect(formatErrorEnvelope(error)).toEqual({
      error: {
        code: 'ADAPTER_UNAVAILABLE',
        message: 'client missing',
      },
    });
  });

  it('sets network timeout details including timeoutMs', () => {
    const error = new NetworkTimeoutError(5000, { operation: 'verify' });
    expect(error.code).toBe('NETWORK_TIMEOUT');
    expect(error.timeoutMs).toBe(5000);
    expect(formatErrorEnvelope(error)).toEqual({
      error: {
        code: 'NETWORK_TIMEOUT',
        message: 'operation timed out after 5000ms',
        details: { operation: 'verify', timeoutMs: 5000 },
      },
    });
  });
});

describe('error codes', () => {
  it('exposes the expected stable codes', () => {
    expect(new AdapterUnavailableError('x').code).toBe('ADAPTER_UNAVAILABLE');
    expect(new UpstreamBreakingChangeError('x').code).toBe(
      'UPSTREAM_BREAKING_CHANGE',
    );
    expect(new UpstreamSchemaMismatchError('x').code).toBe(
      'UPSTREAM_SCHEMA_MISMATCH',
    );
    expect(new NetworkTimeoutError(1).code).toBe('NETWORK_TIMEOUT');
    expect(new UsageError('x').code).toBe('USAGE_ERROR');
    expect(new InternalError('x').code).toBe('INTERNAL_ERROR');
    expect(new NotImplementedError('x').code).toBe('NOT_IMPLEMENTED');
  });
});

describe('redaction', () => {
  it('replaces registered secrets in strings and nested objects', () => {
    registerSecret('super-secret-token');
    const input = {
      message: 'Authorization: super-secret-token',
      nested: ['prefix super-secret-token suffix'],
      number: 42,
    };
    expect(redact(input)).toEqual({
      message: 'Authorization: [REDACTED]',
      nested: ['prefix [REDACTED] suffix'],
      number: 42,
    });
  });

  it('does not leak a fake token (snapshot)', () => {
    registerSecret('fake-token-do-not-leak');
    const result = redact({
      error: 'request failed with fake-token-do-not-leak',
      details: { token: 'fake-token-do-not-leak' },
    });
    expect(JSON.stringify(result)).not.toContain('fake-token-do-not-leak');
    expect(result).toMatchSnapshot();
  });
});
