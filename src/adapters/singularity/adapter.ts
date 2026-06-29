import { existsSync } from 'node:fs';
import path from 'node:path';
import { AdapterUnavailableError } from '../../core/errors.js';
import { registerSecret } from '../../core/redact.js';
import { extractArchive } from '../../upstream/extract.js';
import { archivePath, extractedDir } from '../../upstream/paths.js';

export interface SingularityAdapterConfig {
  baseUrl: string;
  accessToken: string;
  enableLogging?: boolean;
}

export interface SingularityAdapter {
  listTasks(params?: Record<string, unknown>): Promise<unknown>;
  getTask(id: string): Promise<unknown>;
  listProjects(params?: Record<string, unknown>): Promise<unknown>;
  getProject(id: string): Promise<unknown>;
}

interface ApiClientInstance {
  setAccessToken(token: string): void;
  listTasks(params?: Record<string, unknown>): Promise<unknown>;
  getTask(id: string): Promise<unknown>;
  listProjects(params?: Record<string, unknown>): Promise<unknown>;
  getProject(id: string): Promise<unknown>;
}

type ApiClientConstructor = new (config: {
  baseUrl: string;
  enableLogging: boolean;
}) => ApiClientInstance;

function loadApiClient(extractedDirPath: string): unknown {
  const clientPath = path.join(extractedDirPath, 'client.js');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const clientModule = require(clientPath);
  return clientModule.ApiClient;
}

export function createSingularityAdapter(
  config: SingularityAdapterConfig,
): SingularityAdapter {
  let apiClient: ApiClientInstance | null = null;

  async function ensureLoaded(): Promise<ApiClientInstance> {
    if (apiClient) {
      return apiClient;
    }

    if (!existsSync(extractedDir)) {
      await extractArchive(archivePath, extractedDir);
    }

    const ApiClient = loadApiClient(extractedDir);
    if (typeof ApiClient !== 'function') {
      throw new AdapterUnavailableError('official ApiClient is not callable', {
        path: 'client.js',
      });
    }

    const Client = ApiClient as ApiClientConstructor;
    const instance = new Client({
      baseUrl: config.baseUrl,
      enableLogging: config.enableLogging ?? false,
    });
    instance.setAccessToken(config.accessToken);
    registerSecret(config.accessToken);

    for (const method of [
      'listTasks',
      'getTask',
      'listProjects',
      'getProject',
    ] as const) {
      if (typeof instance[method] !== 'function') {
        throw new AdapterUnavailableError('method not available', { method });
      }
    }

    apiClient = instance;
    return apiClient;
  }

  return {
    listTasks: async (params) => (await ensureLoaded()).listTasks(params),
    getTask: async (id) => (await ensureLoaded()).getTask(id),
    listProjects: async (params) =>
      (await ensureLoaded()).listProjects(params),
    getProject: async (id) => (await ensureLoaded()).getProject(id),
  };
}
