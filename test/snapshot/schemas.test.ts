import { describe, expect, it } from 'vitest';
import { allSchemas } from '../../src/schemas/index.js';
import { commandMetadata } from '../../src/commands/registry.js';

const STABLE_CODES = [
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
];

describe('allSchemas snapshot', () => {
  it('matches snapshot', () => {
    expect(allSchemas()).toMatchSnapshot();
  });

  it('ErrorEnvelope code enum contains all 22 stable codes', () => {
    const schemas = allSchemas();
    const envelope = schemas['ErrorEnvelope'] as {
      properties?: { error?: { properties?: { code?: { enum?: string[] } } } };
    };
    const codes: string[] =
      envelope?.properties?.error?.properties?.code?.enum ?? [];
    for (const code of STABLE_CODES) {
      expect(codes).toContain(code);
    }
    expect(codes).toHaveLength(22);
  });

  it('every non-null outputSchema in commandMetadata exists in allSchemas', () => {
    const schemas = allSchemas();
    const keys = Object.keys(schemas);
    for (const meta of commandMetadata) {
      if (meta.outputSchema !== null) {
        expect(keys).toContain(meta.outputSchema);
      }
    }
  });
});
