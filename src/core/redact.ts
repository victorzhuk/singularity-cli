const secrets = new Set<string>();

export function registerSecret(value: string): void {
  if (value) {
    secrets.add(value);
  }
}

export function redact(input: unknown): unknown {
  if (typeof input === 'string') {
    let result = input;
    for (const secret of secrets) {
      result = result.split(secret).join('[REDACTED]');
    }
    return result;
  }

  if (Array.isArray(input)) {
    return input.map(redact);
  }

  if (input !== null && typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      result[key] = redact(value);
    }
    return result;
  }

  return input;
}
