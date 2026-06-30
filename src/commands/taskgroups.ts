import { Command } from 'commander';
import { resolveApiUrl, resolveToken } from '../auth/index.js';
import { loadResolvedConfig, resolveProfile } from '../config/index.js';
import { contextFromCommand } from '../core/context.js';
import { ValidationFailedError } from '../core/errors.js';
import { requireConfirmation } from '../core/guards.js';
import {
  createSingularityAdapter,
  type CreateTaskGroupRequest,
  type UpdateTaskGroupRequest,
} from '../adapters/singularity/index.js';
import { output, outputSummary, outputTable } from '../formatters/index.js';
import type { CommandMeta } from '../schemas/index.js';

function normalizeTaskGroupList(raw: unknown): { items: unknown[]; total?: number } {
  if (raw === null || raw === undefined) return { items: [] };
  if (Array.isArray(raw)) return { items: raw };
  const r = raw as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items : [];
  const result: { items: unknown[]; total?: number } = { items };
  if (typeof r.total === 'number') result.total = r.total;
  return result;
}

export function buildCreateTaskGroupPayload(opts: {
  title: string;
  project: string;
  color?: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = { title: opts.title, projectId: opts.project };
  if (opts.color !== undefined) payload.color = opts.color;
  return payload;
}

export function buildUpdateTaskGroupPayload(
  id: string,
  opts: { title?: string; color?: string },
): Record<string, unknown> {
  const payload: Record<string, unknown> = { id };
  if (opts.title !== undefined) payload.title = opts.title;
  if (opts.color !== undefined) payload.color = opts.color;
  if (Object.keys(payload).length <= 1) {
    throw new ValidationFailedError('no fields to update', { field: 'payload' });
  }
  return payload;
}

export const taskGroupsMetadata: CommandMeta[] = [
  {
    name: 'task-groups list',
    description: 'list task groups',
    args: [],
    examples: [
      'singularity task-groups list --json',
      'singularity task-groups list --project <id> --json',
    ],
    outputSchema: null,
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
    name: 'task-groups get',
    description: 'get a task group by id',
    args: [],
    examples: ['singularity task-groups get --id <id> --json'],
    outputSchema: null,
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
    name: 'task-groups create',
    description: 'create a new task group',
    args: [],
    examples: [
      'singularity task-groups create --title "Week 1" --project <id> --json',
    ],
    outputSchema: null,
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
    name: 'task-groups update',
    description: 'update a task group',
    args: [],
    examples: [
      'singularity task-groups update --id <id> --title "Week 2" --json',
    ],
    outputSchema: null,
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
    name: 'task-groups delete',
    description: 'delete a task group',
    args: [],
    examples: [
      'singularity task-groups delete --id <id> --yes --json',
      'singularity task-groups delete --id <id> --force --json',
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
];

export function createTaskGroupsCommand(): Command {
  const taskGroups = new Command('task-groups').description('manage task groups');

  const listCmd = new Command('list')
    .description('list task groups')
    .option('--project <id>', 'filter by project id')
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
      const { project } = listCmd.opts() as { project?: string };
      const params: Record<string, unknown> = {};
      if (project) params.projectId = project;
      const raw = await adapter.listTaskGroups(params);
      const result = normalizeTaskGroupList(raw);
      output(ctx, result, () => {
        outputTable(
          ctx,
          ['ID', 'TITLE', 'PROJECT'],
          result.items.map((g) => {
            const r = (g !== null && typeof g === 'object') ? g as Record<string, unknown> : {};
            return [String(r.id ?? ''), String(r.title ?? ''), String(r.projectId ?? '')];
          }),
        );
      });
    });

  const getCmd = new Command('get')
    .description('get a task group by id')
    .requiredOption('--id <id>', 'task group id')
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
      const raw = await adapter.getTaskGroup(id);
      output(ctx, raw, () => {
        const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
        outputSummary(ctx, `${String(r.id ?? id)}  ${String(r.title ?? '')}`);
      });
    });

  const createCmd = new Command('create')
    .description('create a new task group')
    .requiredOption('--title <title>', 'task group title')
    .requiredOption('--project <id>', 'project id')
    .option('--color <color>', 'task group color')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(createCmd);
      const opts = createCmd.opts() as { title: string; project: string; color?: string };
      const payload = buildCreateTaskGroupPayload({
        title: opts.title,
        project: opts.project,
        color: opts.color,
      });
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const raw = await adapter.createTaskGroup(payload as unknown as CreateTaskGroupRequest);
      output(ctx, raw, () => {
        const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
        outputSummary(ctx, `created task group ${String(r.id ?? '')}  ${opts.title}`);
      });
    });

  const updateCmd = new Command('update')
    .description('update a task group')
    .requiredOption('--id <id>', 'task group id')
    .option('--title <title>', 'new title')
    .option('--color <color>', 'new color')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(updateCmd);
      const opts = updateCmd.opts() as { id: string; title?: string; color?: string };
      const payload = buildUpdateTaskGroupPayload(opts.id, { title: opts.title, color: opts.color });
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const raw = await adapter.updateTaskGroup(payload as unknown as UpdateTaskGroupRequest);
      output(ctx, raw, () => {
        const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
        outputSummary(ctx, `updated task group ${String(r.id ?? opts.id)}`);
      });
    });

  const deleteCmd = new Command('delete')
    .description('delete a task group')
    .requiredOption('--id <id>', 'task group id')
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
      await adapter.deleteTaskGroup(id);
      output(ctx, { deleted: true, id }, () => {
        outputSummary(ctx, `deleted task group ${id}`);
      });
    });

  taskGroups.addCommand(listCmd);
  taskGroups.addCommand(getCmd);
  taskGroups.addCommand(createCmd);
  taskGroups.addCommand(updateCmd);
  taskGroups.addCommand(deleteCmd);

  return taskGroups;
}
