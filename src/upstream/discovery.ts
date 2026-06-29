import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { UpstreamBreakingChangeError } from '../core/errors.js';

export interface DiscoveredClient {
  functions: string[];
}

export interface DiscoveredModule {
  functions: string[];
}

export interface DiscoveryResult {
  version: string;
  sha256: string;
  requiredFiles: string[];
  client: DiscoveredClient;
  modules: Record<string, DiscoveredModule>;
  adapterMap: Record<string, { source: 'ApiClient'; method: string }>;
}

const requiredFiles = ['client.js', 'server.js', 'modules/', 'utils/'];
const adapterMethods = ['listTasks', 'getTask', 'listProjects', 'getProject'];

async function assertRequiredFiles(extractedDir: string): Promise<void> {
  const missing: string[] = [];

  for (const name of requiredFiles) {
    const target = path.join(extractedDir, name);
    try {
      const info = await stat(target);
      if (name.endsWith('/') && !info.isDirectory()) {
        missing.push(name);
      }
    } catch {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new UpstreamBreakingChangeError('required files missing', {
      missing,
    });
  }
}

async function discoverModules(
  extractedDir: string,
): Promise<Record<string, DiscoveredModule>> {
  const modulesDir = path.join(extractedDir, 'modules');
  const modules: Record<string, DiscoveredModule> = {};

  const entries = await readdir(modulesDir);
  const files = entries
    .filter((name) => name.endsWith('.js'))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const modulePath = path.join(modulesDir, file);
    const moduleName = path.basename(file, '.js');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(modulePath);
    modules[moduleName] = {
      functions: Object.keys(mod).sort((a, b) => a.localeCompare(b)),
    };
  }

  return modules;
}

export async function discoverUpstream(
  extractedDir: string,
  sha256: string,
): Promise<DiscoveryResult> {
  await assertRequiredFiles(extractedDir);

  const clientPath = path.join(extractedDir, 'client.js');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const clientModule = require(clientPath);
  const ApiClient = clientModule.ApiClient;

  if (typeof ApiClient !== 'function') {
    throw new UpstreamBreakingChangeError(
      'ApiClient export missing or not callable',
      { reason: 'ApiClient export missing or not callable' },
    );
  }

  const clientFunctions = Object.getOwnPropertyNames(ApiClient.prototype)
    .filter((name) => name !== 'constructor')
    .sort((a, b) => a.localeCompare(b));

  const modules = await discoverModules(extractedDir);

  const adapterMap: Record<string, { source: 'ApiClient'; method: string }> =
    {};
  for (const method of adapterMethods) {
    if (clientFunctions.includes(method)) {
      adapterMap[method] = { source: 'ApiClient', method };
    }
  }

  if (Object.keys(adapterMap).length === 0) {
    throw new UpstreamBreakingChangeError(
      'no adapter methods found on ApiClient',
      { reason: 'no adapter methods found on ApiClient' },
    );
  }

  return {
    version: '2.1.1',
    sha256,
    requiredFiles: [...requiredFiles],
    client: { functions: clientFunctions },
    modules,
    adapterMap,
  };
}
