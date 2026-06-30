import path from 'node:path';
import {
  AdapterUnavailableError,
  AuthScopeDeniedError,
  AuthTokenInvalidError,
  CliError,
  NetworkTimeoutError,
} from '../../core/errors.js';
import { redact, registerSecret } from '../../core/redact.js';
import { loadUpstreamRuntime } from '../../upstream/runtime.js';

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export interface CreateTaskRequest {
  title: string;
  projectId?: string;
  priority?: number;
  date?: string | null;
  useTime?: boolean;
  notify?: number;
  alarmNotify?: boolean;
  notifyMinutes?: number[];
}

export interface UpdateTaskRequest {
  id: string;
  title?: string;
  projectId?: string;
  priority?: number;
  date?: string | null;
  useTime?: boolean;
  notify?: number;
  alarmNotify?: boolean;
  notifyMinutes?: number[];
  status?: number | string;
}

export interface CompleteTaskRequest {
  id: string;
}

export interface MoveTaskRequest {
  id: string;
  projectId: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string | null;
  emoji?: string | null;
  parentId?: string | null;
}

export interface UpdateProjectRequest {
  id: string;
  name?: string;
  description?: string | null;
  emoji?: string | null;
  parentId?: string | null;
}

export interface SingularityAdapterConfig {
  baseUrl: string;
  accessToken: string;
  enableLogging?: boolean;
  requestTimeoutMs?: number;
}

export interface SingularityAdapter {
  listTasks(params?: Record<string, unknown>): Promise<unknown>;
  getTask(id: string): Promise<unknown>;
  listProjects(params?: Record<string, unknown>): Promise<unknown>;
  getProject(id: string): Promise<unknown>;
  createTask(req: CreateTaskRequest): Promise<unknown>;
  updateTask(req: UpdateTaskRequest): Promise<unknown>;
  completeTask(req: CompleteTaskRequest): Promise<unknown>;
  moveTask(req: MoveTaskRequest): Promise<unknown>;
  deleteTask(id: string): Promise<unknown>;
  createProject(req: CreateProjectRequest): Promise<unknown>;
  updateProject(req: UpdateProjectRequest): Promise<unknown>;
  authStatus(): Promise<unknown>;
}

interface ApiClientInstance {
  setAccessToken(token: string): void;
  listTasks(params?: Record<string, unknown>): Promise<unknown>;
  getTask(id: string): Promise<unknown>;
  listProjects(params?: Record<string, unknown>): Promise<unknown>;
  getProject(id: string): Promise<unknown>;
  createTask(task: Record<string, unknown>): Promise<unknown>;
  updateTask(task: Record<string, unknown>): Promise<unknown>;
  deleteTask(id: string): Promise<unknown>;
  createProject(project: Record<string, unknown>): Promise<unknown>;
  updateProject(project: Record<string, unknown>): Promise<unknown>;
}

type ApiClientConstructor = new (config: {
  baseUrl: string;
  enableLogging: boolean;
}) => ApiClientInstance;

function loadApiClient(runtimePath: string): unknown {
  const clientPath = path.join(runtimePath, 'client.js');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const clientModule = require(clientPath);
  return clientModule.ApiClient;
}

function timeoutPromise<T>(
  operation: string,
  timeoutMs: number,
): Promise<T> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => {
      reject(new NetworkTimeoutError(timeoutMs, { operation }));
    }, timeoutMs);
  });
}

async function safeMessage(err: unknown): Promise<string> {
  if (err instanceof Error) {
    return String(redact(err.message));
  }
  return String(redact(err));
}

function safeStatus(err: unknown): number | undefined {
  if (err === null || typeof err !== 'object') {
    return undefined;
  }

  const e = err as Record<string, unknown>;
  if (typeof e.status === 'number') {
    return e.status;
  }

  if (e.response !== null && typeof e.response === 'object') {
    const response = e.response as Record<string, unknown>;
    if (typeof response.status === 'number') {
      return response.status;
    }
  }

  return undefined;
}

function safeUpstreamMessage(err: unknown): string | undefined {
  if (err === null || typeof err !== 'object') {
    return undefined;
  }

  const e = err as Record<string, unknown>;

  if (e.response !== null && typeof e.response === 'object') {
    const response = e.response as Record<string, unknown>;
    if (response.data !== null && typeof response.data === 'object') {
      const data = response.data as Record<string, unknown>;
      if (typeof data.message === 'string' && data.message.trim().length > 0) {
        return String(redact(data.message));
      }
      if (typeof data.error === 'string' && data.error.trim().length > 0) {
        return String(redact(data.error));
      }
    }
  }

  if (typeof e.message === 'string' && e.message.trim().length > 0) {
    return String(redact(e.message));
  }

  return undefined;
}

function normalizeAdapterError(err: unknown, operation: string): CliError {
  if (err instanceof CliError) {
    return err;
  }

  const message = safeMessage(err);
  const details: Record<string, unknown> = { operation };
  const status = safeStatus(err);
  if (status !== undefined) {
    details.status = status;
  }
  const upstreamMessage = safeUpstreamMessage(err);
  if (upstreamMessage !== undefined) {
    details.message = upstreamMessage;
  }

  const redactedDetails = redact(details) as Record<string, unknown>;

  if (status === 401) {
    return new AuthTokenInvalidError(
      `${operation} failed: ${message}`,
      redactedDetails,
    );
  }

  if (status === 403) {
    return new AuthScopeDeniedError(
      `${operation} failed: ${message}`,
      redactedDetails,
    );
  }

  return new AdapterUnavailableError(
    `${operation} failed: ${message}`,
    redactedDetails,
  );
}

async function callWithTimeout<T>(
  operation: string,
  timeoutMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  if (timeoutMs <= 0) {
    return fn();
  }

  try {
    return await Promise.race([fn(), timeoutPromise<T>(operation, timeoutMs)]);
  } catch (err) {
    throw normalizeAdapterError(err, operation);
  }
}

export function createSingularityAdapter(
  config: SingularityAdapterConfig,
): SingularityAdapter {
  const timeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  let apiClient: ApiClientInstance | null = null;

  async function ensureLoaded(): Promise<ApiClientInstance> {
    if (apiClient) {
      return apiClient;
    }

    const { runtimePath } = await loadUpstreamRuntime();
    const ApiClient = loadApiClient(runtimePath);
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
    registerSecret(config.accessToken);
    instance.setAccessToken(config.accessToken);

    for (const method of [
      'listTasks',
      'getTask',
      'listProjects',
      'getProject',
      'createTask',
      'updateTask',
      'deleteTask',
      'createProject',
      'updateProject',
    ] as const) {
      if (typeof instance[method] !== 'function') {
        throw new AdapterUnavailableError('method not available', { method });
      }
    }

    apiClient = instance;
    return apiClient;
  }

  async function call<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    await ensureLoaded();
    return callWithTimeout(operation, timeoutMs, fn);
  }

  return {
    listTasks: async (params) =>
      call('listTasks', () => apiClient!.listTasks(params)),
    getTask: async (id) => call('getTask', () => apiClient!.getTask(id)),
    listProjects: async (params) =>
      call('listProjects', () => apiClient!.listProjects(params)),
    getProject: async (id) =>
      call('getProject', () => apiClient!.getProject(id)),
    createTask: async (req) =>
      call('createTask', () => apiClient!.createTask(req as unknown as Record<string, unknown>)),
    updateTask: async (req) =>
      call('updateTask', () => apiClient!.updateTask(req as unknown as Record<string, unknown>)),
    completeTask: async (req) =>
      call('completeTask', () => apiClient!.updateTask({ id: req.id, status: 'done' })),
    moveTask: async (req) =>
      call('moveTask', () => apiClient!.updateTask({ id: req.id, projectId: req.projectId })),
    deleteTask: async (id) =>
      call('deleteTask', () => apiClient!.deleteTask(id)),
    createProject: async (req) =>
      call('createProject', () => apiClient!.createProject(req as unknown as Record<string, unknown>)),
    updateProject: async (req) =>
      call('updateProject', () => apiClient!.updateProject(req as unknown as Record<string, unknown>)),
    authStatus: async () =>
      call('authStatus', () => apiClient!.listProjects({ maxCount: 1 })),
  };
}
