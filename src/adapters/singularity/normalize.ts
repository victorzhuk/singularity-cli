import { NormalizedTaskSchema, type NormalizedTask, type TaskList } from '../../schemas/task.js';
import { NormalizedProjectSchema, type NormalizedProject, type ProjectList } from '../../schemas/project.js';
import { UpstreamSchemaMismatchError } from '../../core/errors.js';

export function normalizeTask(raw: unknown, command: string): NormalizedTask {
  const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};

  if (typeof r.id !== 'string') {
    throw new UpstreamSchemaMismatchError(`${command}: missing required field`, {
      command,
      missingFields: ['id'],
    });
  }

  const obj: Record<string, unknown> = {
    id: r.id,
    title: r.title ?? '',
    priority: r.priority ?? 1,
    date: r.date ?? null,
    useTime: r.useTime ?? false,
    notify: r.notify ?? 0,
    alarmNotify: r.alarmNotify ?? false,
    notifyMinutes: r.notifyMinutes ?? [],
    modifiedDate: r.modifiedDate ?? r.updatedAt ?? '',
    createdDate: r.createdDate ?? r.createdAt ?? '',
    status: String(r.status ?? ''),
    projectId: r.projectId ?? '',
  };

  if (r.isNote !== undefined) {
    obj.isNote = r.isNote;
  }

  if (Array.isArray(r.tags) && r.tags.length > 0) {
    obj.tags = r.tags as string[];
  }

  return NormalizedTaskSchema.parse(obj);
}

export function normalizeProject(raw: unknown, command: string): NormalizedProject {
  const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};

  if (typeof r.id !== 'string') {
    throw new UpstreamSchemaMismatchError(`${command}: missing required field`, {
      command,
      missingFields: ['id'],
    });
  }

  const obj: Record<string, unknown> = {
    id: r.id,
    name: r.name ?? r.title ?? '',
    description: r.description ?? null,
    emoji: r.emoji ?? null,
    baseTaskGroupId: r.baseTaskGroupId ?? null,
  };

  if (r.showInBasket !== undefined) {
    obj.showInBasket = r.showInBasket;
  }
  if (r.archivedAt !== undefined) {
    obj.archivedAt = r.archivedAt;
  }
  if (r.parentId !== undefined) {
    obj.parentId = r.parentId;
  }

  return NormalizedProjectSchema.parse(obj);
}

export function normalizeTaskList(raw: unknown, command: string): TaskList {
  if (raw === null || raw === undefined) {
    return { items: [] };
  }

  if (Array.isArray(raw)) {
    return raw.length === 0 ? { items: [] } : { items: raw.map(item => normalizeTask(item, command)) };
  }

  const r = raw as Record<string, unknown>;
  const items = r.items;

  if (items === null || items === undefined || (Array.isArray(items) && items.length === 0)) {
    const result: TaskList = { items: [] };
    if (typeof r.total === 'number') result.total = r.total;
    return result;
  }

  if (!Array.isArray(items)) {
    return { items: [] };
  }

  const result: TaskList = { items: items.map(item => normalizeTask(item, command)) };
  if (typeof r.total === 'number') result.total = r.total;
  return result;
}

export function normalizeProjectList(raw: unknown, command: string): ProjectList {
  if (raw === null || raw === undefined) {
    return { items: [] };
  }

  if (Array.isArray(raw)) {
    return raw.length === 0 ? { items: [] } : { items: raw.map(item => normalizeProject(item, command)) };
  }

  const r = raw as Record<string, unknown>;
  const items = r.items;

  if (items === null || items === undefined || (Array.isArray(items) && items.length === 0)) {
    const result: ProjectList = { items: [] };
    if (typeof r.total === 'number') result.total = r.total;
    return result;
  }

  if (!Array.isArray(items)) {
    return { items: [] };
  }

  const result: ProjectList = { items: items.map(item => normalizeProject(item, command)) };
  if (typeof r.total === 'number') result.total = r.total;
  return result;
}
