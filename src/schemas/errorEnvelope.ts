import * as z from 'zod';

const errorCodes = [
  'ADAPTER_UNAVAILABLE',
  'AUTH_FAILED',
  'AUTH_SCOPE_DENIED',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_INVALID',
  'AUTH_TOKEN_MISSING',
  'BASE_TASK_GROUP_MISSING',
  'CONFIRMATION_REQUIRED',
  'CONFIG_INVALID',
  'DELTA_INVALID',
  'GENERATED_FILE_COLLISION',
  'INTERNAL_ERROR',
  'NETWORK_TIMEOUT',
  'NOT_IMPLEMENTED',
  'PROFILE_UNKNOWN',
  'PROJECT_ALIAS_UNKNOWN',
  'PROJECT_BINDING_MISSING',
  'UNSUPPORTED_DRY_RUN',
  'UPSTREAM_BREAKING_CHANGE',
  'UPSTREAM_SCHEMA_MISMATCH',
  'USAGE_ERROR',
  'VALIDATION_FAILED',
] as const;

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum(errorCodes),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
