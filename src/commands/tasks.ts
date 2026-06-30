import { Command } from 'commander';
import { resolveApiUrl, resolveToken } from '../auth/index.js';
import {
  loadResolvedConfig,
  resolveBaseTaskGroupId,
  resolveProfile,
  resolveProjectId,
  requireProjectId,
} from '../config/index.js';
import { contextFromCommand } from '../core/context.js';
import type { ExecutionContext } from '../core/context.js';
import { BaseTaskGroupMissingError, ValidationFailedError } from '../core/errors.js';
import { requireConfirmation } from '../core/guards.js';
import { buildNotifyMinutes } from '../core/validators.js';
import {
  createSingularityAdapter,
  type CreateTaskRequest,
  type MoveTaskRequest,
  type UpdateTaskRequest,
} from '../adapters/singularity/index.js';
import { normalizeTask, normalizeTaskList } from '../adapters/singularity/normalize.js';
import { output, outputSummary, outputTable } from '../formatters/index.js';
import type { CommandMeta } from '../schemas/index.js';

export interface CreateTaskOptions {
  title: string;
  date?: string;
  deadline?: string;
  tags?: string[];
  description?: string;
  parent?: string;
  checklist?: string;
  assignee?: string;
  notifyMinutes?: string;
  notify?: boolean;
  alarmNotify?: boolean;
  isNote?: boolean;
  taskGroup?: string;
  priority?: number;
}

export interface UpdateTaskOptions {
  title?: string;
  priority?: number;
  date?: string;
  status?: string;
  notifyMinutes?: string;
  notify?: boolean;
  alarmNotify?: boolean;
}

function parseTimezoneOffset(timezone: string): string {
  if (/^[+-]\d{2}:\d{2}$/.test(timezone)) return timezone;
  if (timezone === 'UTC' || timezone === 'GMT') return '+00:00';
  const m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(timezone);
  if (m) {
    const sign = m[1];
    const hours = m[2].padStart(2, '0');
    const mins = m[3] ?? '00';
    return `${sign}${hours}:${mins}`;
  }
  return '+00:00';
}

export function buildTaskDate(input: string, timezone: string): { date: string; useTime: boolean } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return { date: input, useTime: false };

  const tIdx = input.indexOf('T');
  const spIdx = input.indexOf(' ');
  let sepIdx: number;
  if (tIdx === -1) sepIdx = spIdx;
  else if (spIdx === -1) sepIdx = tIdx;
  else sepIdx = Math.min(tIdx, spIdx);

  const datePart = input.slice(0, sepIdx);
  const timePart = input.slice(sepIdx + 1);
  const timeNorm = timePart.split(':').length === 2 ? `${timePart}:00` : timePart;
  const offset = parseTimezoneOffset(timezone);
  return { date: `${datePart}T${timeNorm}${offset}`, useTime: true };
}

export function buildNotifications(opts: {
  notifyMinutes?: string;
  notify?: boolean;
  alarmNotify?: boolean;
}): { notify?: 1; notifyMinutes?: number[]; alarmNotify?: true } {
  const result: { notify?: 1; notifyMinutes?: number[]; alarmNotify?: true } = {};

  if (opts.notifyMinutes && opts.notifyMinutes.trim().length > 0) {
    result.notifyMinutes = buildNotifyMinutes(opts.notifyMinutes);
    result.notify = 1;
  } else if (opts.notify === true) {
    result.notify = 1;
  }

  if (opts.alarmNotify === true) {
    result.alarmNotify = true;
  }

  return result;
}

export function buildCreateTaskPayload(
  opts: CreateTaskOptions,
  _ctx: ExecutionContext,
  resolved: { projectId: string; baseTaskGroupId?: string; priority: number; timezone: string },
): Record<string, unknown> {
  if (resolved.baseTaskGroupId === undefined) {
    throw new BaseTaskGroupMissingError(
      'no task group configured; use --task-group or set baseTaskGroupId in config',
      { project: resolved.projectId },
    );
  }

  const payload: Record<string, unknown> = {
    title: opts.title,
    projectId: resolved.projectId,
    taskGroupId: resolved.baseTaskGroupId,
    priority: resolved.priority,
  };

  if (opts.date) {
    const { date, useTime } = buildTaskDate(opts.date, resolved.timezone);
    payload.date = date;
    payload.useTime = useTime;
  }

  if (opts.deadline) payload.deadline = opts.deadline;
  if (opts.tags && opts.tags.length > 0) payload.tags = opts.tags;
  if (opts.description) payload.description = opts.description;
  if (opts.parent) payload.parent = opts.parent;
  if (opts.checklist) payload.checklist = opts.checklist;
  if (opts.assignee) payload.assignee = opts.assignee;

  Object.assign(payload, buildNotifications({
    notifyMinutes: opts.notifyMinutes,
    notify: opts.notify,
    alarmNotify: opts.alarmNotify,
  }));

  if (opts.isNote) payload.isNote = true;

  return payload;
}

export function buildUpdateTaskPayload(
  id: string,
  opts: UpdateTaskOptions,
  resolved: { timezone: string },
): Record<string, unknown> {
  const payload: Record<string, unknown> = { id };

  if (opts.title !== undefined) payload.title = opts.title;
  if (opts.priority !== undefined) payload.priority = opts.priority;

  if (opts.date !== undefined) {
    const { date, useTime } = buildTaskDate(opts.date, resolved.timezone);
    payload.date = date;
    payload.useTime = useTime;
  }

  if (opts.status !== undefined) payload.status = opts.status;

  if (opts.notifyMinutes !== undefined || opts.notify !== undefined || opts.alarmNotify !== undefined) {
    Object.assign(payload, buildNotifications({
      notifyMinutes: opts.notifyMinutes,
      notify: opts.notify,
      alarmNotify: opts.alarmNotify,
    }));
  }

  if (Object.keys(payload).length <= 1) {
    throw new ValidationFailedError('no fields to update', { field: 'payload' });
  }

  return payload;
}

export const tasksMetadata: CommandMeta[] = [
  {
    name: 'tasks list',
    description: 'list tasks',
    args: [],
    examples: [
      'singularity tasks list --json',
      'singularity tasks list --project myproject --status open --json',
    ],
    outputSchema: 'TaskList',
    errorCodes: [
      'AUTH_TOKEN_MISSING',
      'AUTH_TOKEN_INVALID',
      'AUTH_FAILED',
      'ADAPTER_UNAVAILABLE',
      'CONFIG_INVALID',
      'PROFILE_UNKNOWN',
    ],
  },
  {
    name: 'tasks get',
    description: 'get a task by id',
    args: [],
    examples: ['singularity tasks get --id <id> --json'],
    outputSchema: 'NormalizedTask',
    errorCodes: [
      'AUTH_TOKEN_MISSING',
      'AUTH_TOKEN_INVALID',
      'AUTH_FAILED',
      'ADAPTER_UNAVAILABLE',
      'CONFIG_INVALID',
      'PROFILE_UNKNOWN',
    ],
  },
  {
    name: 'tasks create',
    description: 'create a new task',
    args: [],
    examples: [
      'singularity tasks create --title "My Task" --project myproject --task-group g1 --json',
      'singularity tasks create --title "My Task" --date 2026-07-01 --dry-run --json',
    ],
    outputSchema: 'NormalizedTask',
    errorCodes: [
      'AUTH_TOKEN_MISSING',
      'AUTH_TOKEN_INVALID',
      'AUTH_FAILED',
      'ADAPTER_UNAVAILABLE',
      'VALIDATION_FAILED',
      'BASE_TASK_GROUP_MISSING',
      'PROJECT_BINDING_MISSING',
      'CONFIG_INVALID',
      'PROFILE_UNKNOWN',
    ],
  },
  {
    name: 'tasks update',
    description: 'update a task',
    args: [],
    examples: [
      'singularity tasks update --id <id> --title "New Title" --json',
      'singularity tasks update --id <id> --status done --json',
    ],
    outputSchema: 'NormalizedTask',
    errorCodes: [
      'AUTH_TOKEN_MISSING',
      'AUTH_TOKEN_INVALID',
      'AUTH_FAILED',
      'ADAPTER_UNAVAILABLE',
      'VALIDATION_FAILED',
      'CONFIG_INVALID',
      'PROFILE_UNKNOWN',
    ],
  },
  {
    name: 'tasks complete',
    description: 'complete a task',
    args: [],
    examples: ['singularity tasks complete --id <id> --json'],
    outputSchema: 'NormalizedTask',
    errorCodes: [
      'AUTH_TOKEN_MISSING',
      'AUTH_TOKEN_INVALID',
      'AUTH_FAILED',
      'ADAPTER_UNAVAILABLE',
      'CONFIG_INVALID',
      'PROFILE_UNKNOWN',
    ],
  },
  {
    name: 'tasks delete',
    description: 'delete a task',
    args: [],
    examples: [
      'singularity tasks delete --id <id> --yes --json',
      'singularity tasks delete --id <id> --force --json',
    ],
    outputSchema: null,
    errorCodes: [
      'AUTH_TOKEN_MISSING',
      'AUTH_TOKEN_INVALID',
      'AUTH_FAILED',
      'ADAPTER_UNAVAILABLE',
      'CONFIRMATION_REQUIRED',
      'CONFIG_INVALID',
      'PROFILE_UNKNOWN',
    ],
  },
  {
    name: 'tasks move',
    description: 'move a task to another project',
    args: [],
    examples: ['singularity tasks move --id <id> --project <dest-alias> --json'],
    outputSchema: 'NormalizedTask',
    errorCodes: [
      'AUTH_TOKEN_MISSING',
      'AUTH_TOKEN_INVALID',
      'AUTH_FAILED',
      'ADAPTER_UNAVAILABLE',
      'PROJECT_ALIAS_UNKNOWN',
      'PROJECT_BINDING_MISSING',
      'CONFIG_INVALID',
      'PROFILE_UNKNOWN',
    ],
  },
];

export function createTasksCommand(): Command {
  const tasks = new Command('tasks').description('manage tasks');

  const listCmd = new Command('list')
    .description('list tasks')
    .option('--status <status>', 'filter by status')
    .option('--date-from <date>', 'start date from')
    .option('--date-to <date>', 'start date to')
    .option('--tag <tag>', 'filter by tag (repeatable)', (v: string, prev: string[]) => [...prev, v], [] as string[])
    .option('--limit <n>', 'max results')
    .option('--search <text>', 'search by title')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(listCmd);
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const { status, dateFrom, dateTo, limit, search } = listCmd.opts() as {
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: string;
        search?: string;
      };
      const projectId = ctx.project ? resolveProjectId(ctx, cfg, profile) : undefined;
      const params: Record<string, unknown> = {};
      if (projectId) params.projectId = projectId;
      if (dateFrom) params.startDateFrom = dateFrom;
      if (dateTo) params.startDateTo = dateTo;
      if (limit) params.maxCount = Number(limit);
      const raw = await adapter.listTasks(params);
      let result = normalizeTaskList(raw, 'tasks list');
      if (status) result = { ...result, items: result.items.filter(t => t.status === status) };
      if (search) {
        const q = search.toLowerCase();
        result = { ...result, items: result.items.filter(t => t.title.toLowerCase().includes(q)) };
      }
      output(ctx, result, () => {
        outputTable(
          ctx,
          ['ID', 'TITLE', 'STATUS', 'PRIORITY', 'DATE'],
          result.items.map(t => [t.id, t.title, t.status, String(t.priority), t.date ?? '']),
        );
      });
    });

  const getCmd = new Command('get')
    .description('get a task by id')
    .requiredOption('--id <id>', 'task id')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(getCmd);
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const { id } = getCmd.opts() as { id: string };
      const raw = await adapter.getTask(id);
      const task = normalizeTask(raw, 'tasks get');
      output(ctx, task, () => {
        outputSummary(ctx, `${task.id}  ${task.title}`);
      });
    });

  const createCmd = new Command('create')
    .description('create a task')
    .requiredOption('--title <title>', 'task title')
    .option('--date <date>', 'due date')
    .option('--deadline <date>', 'deadline date')
    .option('--tag <tag>', 'add tag (repeatable)', (v: string, prev: string[]) => [...prev, v], [] as string[])
    .option('--description <text>', 'task description')
    .option('--parent <id>', 'parent task id')
    .option('--checklist <text>', 'checklist content')
    .option('--assignee <id>', 'assignee id')
    .option('--notify-minutes <list>', 'notification minutes, comma-separated')
    .option('--notify', 'enable notification')
    .option('--alarm-notify', 'enable alarm notification')
    .option('--is-note', 'mark as note')
    .option('--task-group <id>', 'task group id')
    .option('--priority <n>', 'task priority', Number)
    .option('--dry-run', 'preview payload without calling API')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(createCmd);
      const opts = createCmd.opts() as {
        title: string;
        date?: string;
        deadline?: string;
        tag?: string[];
        description?: string;
        parent?: string;
        checklist?: string;
        assignee?: string;
        notifyMinutes?: string;
        notify?: boolean;
        alarmNotify?: boolean;
        isNote?: boolean;
        taskGroup?: string;
        priority?: number;
      };

      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const projectId = requireProjectId(ctx, cfg, profile);
      const rawAlias = ctx.project ?? '';
      const allProjects = { ...(cfg.global?.projects ?? {}), ...(cfg.repo?.projects ?? {}) };
      const aliasConfig = allProjects[rawAlias];
      const baseTaskGroupId = opts.taskGroup ?? resolveBaseTaskGroupId(cfg, rawAlias, profile);
      const priority = opts.priority ?? aliasConfig?.defaultPriority ?? 1;
      const timezone = profile.timezone ?? 'GMT+0';

      const payload = buildCreateTaskPayload(
        {
          title: opts.title,
          date: opts.date,
          deadline: opts.deadline,
          tags: opts.tag,
          description: opts.description,
          parent: opts.parent,
          checklist: opts.checklist,
          assignee: opts.assignee,
          notifyMinutes: opts.notifyMinutes,
          notify: opts.notify,
          alarmNotify: opts.alarmNotify,
          isNote: opts.isNote,
          taskGroup: opts.taskGroup,
          priority: opts.priority,
        },
        ctx,
        { projectId, baseTaskGroupId, priority, timezone },
      );

      if (ctx.dryRun) {
        output(
          ctx,
          { dryRun: true, operation: 'tasks create', payload },
          () => { outputSummary(ctx, `[dry-run] would create task: ${opts.title}`); },
        );
        return;
      }

      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const raw = await adapter.createTask(payload as unknown as CreateTaskRequest);
      const task = normalizeTask(raw, 'tasks create');
      output(ctx, task, () => {
        outputSummary(ctx, `created ${task.id}  ${task.title}`);
      });
    });

  const updateCmd = new Command('update')
    .description('update a task')
    .requiredOption('--id <id>', 'task id')
    .option('--title <title>', 'new title')
    .option('--priority <n>', 'new priority', Number)
    .option('--date <date>', 'new due date')
    .option('--status <status>', 'new status')
    .option('--notify-minutes <list>', 'notification minutes, comma-separated')
    .option('--notify', 'enable notification')
    .option('--alarm-notify', 'enable alarm notification')
    .option('--dry-run', 'preview payload without calling API')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(updateCmd);
      const opts = updateCmd.opts() as {
        id: string;
        title?: string;
        priority?: number;
        date?: string;
        status?: string;
        notifyMinutes?: string;
        notify?: boolean;
        alarmNotify?: boolean;
      };

      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const timezone = profile.timezone ?? 'GMT+0';

      const payload = buildUpdateTaskPayload(opts.id, {
        title: opts.title,
        priority: opts.priority,
        date: opts.date,
        status: opts.status,
        notifyMinutes: opts.notifyMinutes,
        notify: opts.notify,
        alarmNotify: opts.alarmNotify,
      }, { timezone });

      if (ctx.dryRun) {
        output(
          ctx,
          { dryRun: true, operation: 'tasks update', payload },
          () => { outputSummary(ctx, `[dry-run] would update task: ${opts.id}`); },
        );
        return;
      }

      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const raw = await adapter.updateTask(payload as unknown as UpdateTaskRequest);
      const task = normalizeTask(raw, 'tasks update');
      output(ctx, task, () => {
        outputSummary(ctx, `updated ${task.id}  ${task.title}`);
      });
    });

  const completeCmd = new Command('complete')
    .description('complete a task')
    .requiredOption('--id <id>', 'task id')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(completeCmd);
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const { id } = completeCmd.opts() as { id: string };
      const raw = await adapter.completeTask({ id });
      const task = normalizeTask(raw, 'tasks complete');
      output(ctx, task, () => {
        outputSummary(ctx, `completed ${task.id}  ${task.title}`);
      });
    });

  const deleteCmd = new Command('delete')
    .description('delete a task')
    .requiredOption('--id <id>', 'task id')
    .option('--yes', 'skip confirmation')
    .option('--force', 'force in JSON mode')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(deleteCmd);
      const { id, yes, force } = deleteCmd.opts() as { id: string; yes?: boolean; force?: boolean };
      requireConfirmation(ctx, { yes, force });
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      await adapter.deleteTask(id);
      output(ctx, { deleted: true, id }, () => {
        outputSummary(ctx, `deleted ${id}`);
      });
    });

  const moveCmd = new Command('move')
    .description('move a task to another project')
    .requiredOption('--id <id>', 'task id')
    .requiredOption('--project <alias>', 'destination project alias or id')
    .option('--dry-run', 'preview payload without calling API')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(moveCmd);
      const moveOpts = moveCmd.opts() as { id: string; project: string };
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const destCtx = { ...ctx, project: moveOpts.project };
      const destProjectId = requireProjectId(destCtx, cfg, profile);

      if (ctx.dryRun) {
        output(
          ctx,
          { dryRun: true, operation: 'tasks move', payload: { id: moveOpts.id, projectId: destProjectId } },
          () => { outputSummary(ctx, `[dry-run] would move task ${moveOpts.id} to project ${destProjectId}`); },
        );
        return;
      }

      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const raw = await adapter.moveTask({ id: moveOpts.id, projectId: destProjectId } as MoveTaskRequest);
      const task = normalizeTask(raw, 'tasks move');
      output(ctx, task, () => {
        outputSummary(ctx, `moved ${task.id} to project ${destProjectId}`);
      });
    });

  tasks.addCommand(listCmd);
  tasks.addCommand(getCmd);
  tasks.addCommand(createCmd);
  tasks.addCommand(updateCmd);
  tasks.addCommand(completeCmd);
  tasks.addCommand(deleteCmd);
  tasks.addCommand(moveCmd);

  return tasks;
}
