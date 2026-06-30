export type ErrorCode =
  | 'ADAPTER_UNAVAILABLE'
  | 'UPSTREAM_BREAKING_CHANGE'
  | 'UPSTREAM_SCHEMA_MISMATCH'
  | 'NETWORK_TIMEOUT'
  | 'USAGE_ERROR'
  | 'INTERNAL_ERROR'
  | 'NOT_IMPLEMENTED'
  | 'AUTH_TOKEN_MISSING'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_FAILED'
  | 'AUTH_SCOPE_DENIED'
  | 'CONFIG_INVALID'
  | 'PROFILE_UNKNOWN'
  | 'PROJECT_BINDING_MISSING'
  | 'PROJECT_ALIAS_UNKNOWN'
  | 'BASE_TASK_GROUP_MISSING'
  | 'VALIDATION_FAILED'
  | 'DELTA_INVALID'
  | 'UNSUPPORTED_DRY_RUN'
  | 'CONFIRMATION_REQUIRED'
  | 'GENERATED_FILE_COLLISION';

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

export class AuthTokenMissingError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTH_TOKEN_MISSING', message, details);
  }
}

export class AuthTokenInvalidError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTH_TOKEN_INVALID', message, details);
  }
}

export class AuthTokenExpiredError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTH_TOKEN_EXPIRED', message, details);
  }
}

export class AuthFailedError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTH_FAILED', message, details);
  }
}

export class AuthScopeDeniedError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTH_SCOPE_DENIED', message, details);
  }
}

export class ConfigInvalidError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFIG_INVALID', message, details);
  }
}

export class ProfileUnknownError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PROFILE_UNKNOWN', message, details);
  }
}

export class ProjectBindingMissingError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PROJECT_BINDING_MISSING', message, details);
  }
}

export class ProjectAliasUnknownError extends CliError {
  constructor(message: string, details?: { knownAliases: string[] } & Record<string, unknown>) {
    super('PROJECT_ALIAS_UNKNOWN', message, details);
  }
}

export class BaseTaskGroupMissingError extends CliError {
  constructor(message: string, details?: { project: string } & Record<string, unknown>) {
    super('BASE_TASK_GROUP_MISSING', message, details);
  }
}

export class ValidationFailedError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_FAILED', message, details);
  }
}

export class DeltaInvalidError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('DELTA_INVALID', message, details);
  }
}

export class UnsupportedDryRunError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('UNSUPPORTED_DRY_RUN', message, details);
  }
}

export class ConfirmationRequiredError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFIRMATION_REQUIRED', message, details);
  }
}

export class GeneratedFileCollisionError extends CliError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('GENERATED_FILE_COLLISION', message, details);
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
