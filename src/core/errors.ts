export type ErrorCode =
  | 'ADAPTER_UNAVAILABLE'
  | 'UPSTREAM_BREAKING_CHANGE'
  | 'UPSTREAM_SCHEMA_MISMATCH'
  | 'NETWORK_TIMEOUT';

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class CliError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export class AdapterUnavailableError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('ADAPTER_UNAVAILABLE', message, details);
  }
}

export class UpstreamBreakingChangeError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('UPSTREAM_BREAKING_CHANGE', message, details);
  }
}

export class UpstreamSchemaMismatchError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('UPSTREAM_SCHEMA_MISMATCH', message, details);
  }
}

export class NetworkTimeoutError extends CliError {
  constructor(readonly timeoutMs: number, details?: Record<string, unknown>) {
    super('NETWORK_TIMEOUT', `operation timed out after ${timeoutMs}ms`, {
      ...details,
      timeoutMs,
    });
  }
}

export function formatErrorEnvelope(error: CliError): ErrorEnvelope {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  };
}
