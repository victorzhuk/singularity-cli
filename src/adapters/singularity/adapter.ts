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

export interface CreateNoteRequest {
  title?: string;
  projectId?: string;
  content?: unknown[];
}

export interface UpdateNoteRequest {
  id: string;
  title?: string;
  projectId?: string;
  content?: unknown[];
}

export interface CreateHabitRequest {
  title: string;
  color?: string;
  status?: number;
}

export interface UpdateHabitRequest {
  id: string;
  title?: string;
  color?: string;
  status?: number;
}

export interface CompleteHabitRequest {
  habitId: string;
  date?: string;
}

export interface CreateTagRequest {
  title: string;
  color?: string;
}

export interface UpdateTagRequest {
  id: string;
  title?: string;
  color?: string;
}

export interface CreateTaskGroupRequest {
  title: string;
  projectId: string;
  color?: string;
}

export interface UpdateTaskGroupRequest {
  id: string;
  title?: string;
  color?: string;
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
  // P1
  listNotes(params?: Record<string, unknown>): Promise<unknown>;
  getNote(id: string): Promise<unknown>;
  createNote(note: CreateNoteRequest): Promise<unknown>;
  updateNote(note: UpdateNoteRequest): Promise<unknown>;
  deleteNote(id: string): Promise<unknown>;
  listHabits(params?: Record<string, unknown>): Promise<unknown>;
  getHabit(id: string): Promise<unknown>;
  createHabit(habit: CreateHabitRequest): Promise<unknown>;
  updateHabit(habit: UpdateHabitRequest): Promise<unknown>;
  deleteHabit(id: string): Promise<unknown>;
  completeHabit(progress: CompleteHabitRequest): Promise<unknown>;
  // P1 — tags
  listTags(params?: Record<string, unknown>): Promise<unknown>;
  getTag(id: string): Promise<unknown>;
  createTag(tag: CreateTagRequest): Promise<unknown>;
  updateTag(tag: UpdateTagRequest): Promise<unknown>;
  deleteTag(id: string): Promise<unknown>;
  // P1 — task groups
  listTaskGroups(params?: Record<string, unknown>): Promise<unknown>;
  getTaskGroup(id: string): Promise<unknown>;
  createTaskGroup(g: CreateTaskGroupRequest): Promise<unknown>;
  updateTaskGroup(g: UpdateTaskGroupRequest): Promise<unknown>;
  deleteTaskGroup(id: string): Promise<unknown>;
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
  // P1 — availability checked per call, not in ensureLoaded
  listNotes?(params?: Record<string, unknown>): Promise<unknown>;
  getNote?(id: string): Promise<unknown>;
  createNote?(note: Record<string, unknown>): Promise<unknown>;
  updateNote?(note: Record<string, unknown>): Promise<unknown>;
  deleteNote?(id: string): Promise<unknown>;
  listHabits?(params?: Record<string, unknown>): Promise<unknown>;
  getHabit?(id: string): Promise<unknown>;
  createHabit?(habit: Record<string, unknown>): Promise<unknown>;
  updateHabit?(habit: Record<string, unknown>): Promise<unknown>;
  deleteHabit?(id: string): Promise<unknown>;
  createHabitDailyProgress?(progress: Record<string, unknown>): Promise<unknown>;
  listTags?(params?: Record<string, unknown>): Promise<unknown>;
  getTag?(id: string): Promise<unknown>;
  createTag?(tag: Record<string, unknown>): Promise<unknown>;
  updateTag?(tag: Record<string, unknown>): Promise<unknown>;
  deleteTag?(id: string): Promise<unknown>;
  listTaskGroups?(params?: Record<string, unknown>): Promise<unknown>;
  getTaskGroup?(id: string): Promise<unknown>;
  createTaskGroup?(g: Record<string, unknown>): Promise<unknown>;
  updateTaskGroup?(g: Record<string, unknown>): Promise<unknown>;
  deleteTaskGroup?(id: string): Promise<unknown>;
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

function safeMessage(err: unknown): string {
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

  async function callP1<T>(
    methodName: string,
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    await ensureLoaded();
    if (typeof (apiClient as unknown as Record<string, unknown>)[methodName] !== 'function') {
      throw new AdapterUnavailableError('method not available', { method: methodName });
    }
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
    listNotes: async (params) =>
      callP1('listNotes', 'listNotes', () => apiClient!.listNotes!(params)),
    getNote: async (id) =>
      callP1('getNote', 'getNote', () => apiClient!.getNote!(id)),
    createNote: async (note) =>
      callP1('createNote', 'createNote', () =>
        apiClient!.createNote!(note as unknown as Record<string, unknown>)),
    updateNote: async (note) =>
      callP1('updateNote', 'updateNote', () =>
        apiClient!.updateNote!(note as unknown as Record<string, unknown>)),
    deleteNote: async (id) =>
      callP1('deleteNote', 'deleteNote', () => apiClient!.deleteNote!(id)),
    listHabits: async (params) =>
      callP1('listHabits', 'listHabits', () => apiClient!.listHabits!(params)),
    getHabit: async (id) =>
      callP1('getHabit', 'getHabit', () => apiClient!.getHabit!(id)),
    createHabit: async (habit) =>
      callP1('createHabit', 'createHabit', () =>
        apiClient!.createHabit!(habit as unknown as Record<string, unknown>)),
    updateHabit: async (habit) =>
      callP1('updateHabit', 'updateHabit', () =>
        apiClient!.updateHabit!(habit as unknown as Record<string, unknown>)),
    deleteHabit: async (id) =>
      callP1('deleteHabit', 'deleteHabit', () => apiClient!.deleteHabit!(id)),
    completeHabit: async (progress) =>
      callP1('createHabitDailyProgress', 'completeHabit', () =>
        apiClient!.createHabitDailyProgress!(progress as unknown as Record<string, unknown>)),
    listTags: async (params) =>
      callP1('listTags', 'listTags', () => apiClient!.listTags!(params)),
    getTag: async (id) =>
      callP1('getTag', 'getTag', () => apiClient!.getTag!(id)),
    createTag: async (tag) =>
      callP1('createTag', 'createTag', () =>
        apiClient!.createTag!(tag as unknown as Record<string, unknown>)),
    updateTag: async (tag) =>
      callP1('updateTag', 'updateTag', () =>
        apiClient!.updateTag!(tag as unknown as Record<string, unknown>)),
    deleteTag: async (id) =>
      callP1('deleteTag', 'deleteTag', () => apiClient!.deleteTag!(id)),
    listTaskGroups: async (params) =>
      callP1('listTaskGroups', 'listTaskGroups', () => apiClient!.listTaskGroups!(params)),
    getTaskGroup: async (id) =>
      callP1('getTaskGroup', 'getTaskGroup', () => apiClient!.getTaskGroup!(id)),
    createTaskGroup: async (g) =>
      callP1('createTaskGroup', 'createTaskGroup', () =>
        apiClient!.createTaskGroup!(g as unknown as Record<string, unknown>)),
    updateTaskGroup: async (g) =>
      callP1('updateTaskGroup', 'updateTaskGroup', () =>
        apiClient!.updateTaskGroup!(g as unknown as Record<string, unknown>)),
    deleteTaskGroup: async (id) =>
      callP1('deleteTaskGroup', 'deleteTaskGroup', () => apiClient!.deleteTaskGroup!(id)),
  };
}
