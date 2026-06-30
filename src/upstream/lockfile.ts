import { readFile, writeFile } from 'node:fs/promises';
import { UpstreamSchemaMismatchError } from '../core/errors.js';
import { sortKeys } from '../core/sortKeys.js';
import { lockfilePath } from './paths.js';

export interface UpstreamLock {
  version: string;
  sourceUrl: string;
  downloadedAt: string;
  sha256: string;
  requiredFiles: string[];
  discoveredModules: {
    client: { functions: string[] };
    modules: Record<string, { functions: string[] }>;
  };
  adapterMap: Record<string, { source: string; method: string }>;
}

export function writeLockfile(lock: UpstreamLock): Promise<void> {
  const serialized = JSON.stringify(sortKeys(lock), null, 2) + '\n';
  return writeFile(lockfilePath, serialized, 'utf8');
}

export function validateUpstreamLock(raw: unknown): UpstreamLock {
  if (raw === null || typeof raw !== 'object') {
    throw new UpstreamSchemaMismatchError('upstream-lock.json must be an object');
  }

  const value = raw as Record<string, unknown>;
  const problems: string[] = [];

  const stringField = (key: string): string | undefined => {
    const field = value[key];
    if (typeof field !== 'string') {
      problems.push(`${key} must be a string`);
      return undefined;
    }
    return field;
  };

  const stringArray = (key: string): string[] | undefined => {
    const field = value[key];
    if (!Array.isArray(field) || field.some((item) => typeof item !== 'string')) {
      problems.push(`${key} must be an array of strings`);
      return undefined;
    }
    return field;
  };

  const version = stringField('version');
  if (version === '') problems.push('version must not be empty');

  const sourceUrl = stringField('sourceUrl');
  if (sourceUrl === '') problems.push('sourceUrl must not be empty');

  stringField('downloadedAt');

  const sha256 = stringField('sha256');
  if (sha256 === '') problems.push('sha256 must not be empty');

  const requiredFiles = stringArray('requiredFiles');
  if (requiredFiles && requiredFiles.length === 0) {
    problems.push('requiredFiles must not be empty');
  }

  validateDiscoveredModules(value.discoveredModules, problems);
  validateAdapterMap(value.adapterMap, problems);

  if (problems.length > 0) {
    throw new UpstreamSchemaMismatchError('upstream-lock.json shape is invalid', {
      problems,
    });
  }

  return raw as UpstreamLock;
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isStringArray(value: unknown): boolean {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function validateDiscoveredModules(
  raw: unknown,
  problems: string[],
): void {
  if (!isStringRecord(raw)) {
    problems.push('discoveredModules must be an object');
    return;
  }

  const client = raw.client;
  if (!isStringRecord(client) || !isStringArray(client.functions)) {
    problems.push('discoveredModules.client.functions must be a string array');
  }

  const modules = raw.modules;
  if (!isStringRecord(modules)) {
    problems.push('discoveredModules.modules must be an object');
    return;
  }

  for (const [name, entry] of Object.entries(modules)) {
    if (!isStringRecord(entry) || !isStringArray(entry.functions)) {
      problems.push(`discoveredModules.modules.${name} must have a functions string array`);
    }
  }
}

function validateAdapterMap(raw: unknown, problems: string[]): void {
  if (!isStringRecord(raw)) {
    problems.push('adapterMap must be an object');
    return;
  }

  for (const [name, entry] of Object.entries(raw)) {
    if (
      !isStringRecord(entry) ||
      typeof entry.source !== 'string' ||
      typeof entry.method !== 'string'
    ) {
      problems.push(`adapterMap.${name} must have source and method strings`);
    }
  }
}

export async function readLockfile(
  lockfile: string = lockfilePath,
): Promise<UpstreamLock> {
  const content = await readFile(lockfile, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new UpstreamSchemaMismatchError('upstream-lock.json is not valid JSON', {
      path: lockfile,
    });
  }
  return validateUpstreamLock(parsed);
}
