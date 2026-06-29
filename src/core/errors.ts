export type ErrorCode =
  | 'ADAPTER_UNAVAILABLE'
  | 'UPSTREAM_BREAKING_CHANGE'
  | 'UPSTREAM_SCHEMA_MISMATCH'
  | 'NETWORK_TIMEOUT'
  | 'USAGE_ERROR'
  | 'INTERNAL_ERROR'
  | 'NOT_IMPLEMENTED';

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

export class UsageError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('USAGE_ERROR', message, details);
  }
}

export class InternalError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('INTERNAL_ERROR', message, details);
  }
}

export class NotImplementedError extends CliError {
  constructor(command: string, details?: Record<string, unknown>) {
    super('NOT_IMPLEMENTED', `${command} is not implemented`, { command, ...details });
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
