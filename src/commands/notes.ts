import { Command } from 'commander';
import { resolveApiUrl, resolveToken } from '../auth/index.js';
import {
  loadResolvedConfig,
  resolveProfile,
  requireProjectId,
} from '../config/index.js';
import { contextFromCommand } from '../core/context.js';
import { DeltaInvalidError } from '../core/errors.js';
import { validateDelta } from '../core/validators.js';
import {
  createSingularityAdapter,
  type CreateNoteRequest,
} from '../adapters/singularity/index.js';
import { normalizeProject } from '../adapters/singularity/normalize.js';
import { output, outputSummary } from '../formatters/index.js';
import type { CommandMeta } from '../schemas/index.js';

function normalizeNoteList(raw: unknown): { items: unknown[]; total?: number } {
  if (raw === null || raw === undefined) return { items: [] };
  if (Array.isArray(raw)) return { items: raw };
  const r = raw as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items : [];
  const result: { items: unknown[]; total?: number } = { items };
  if (typeof r.total === 'number') result.total = r.total;
  return result;
}

export function buildNotePayload(opts: {
  content: string;
  title?: string;
  projectId?: string;
}): Record<string, unknown> {
  let ops: unknown;
  try {
    ops = JSON.parse(opts.content);
  } catch {
    throw new DeltaInvalidError('--content is not valid JSON');
  }
  validateDelta(ops);
  const payload: Record<string, unknown> = { content: ops };
  if (opts.title !== undefined) payload.title = opts.title;
  if (opts.projectId !== undefined) payload.projectId = opts.projectId;
  return payload;
}

export function buildAddItemPayload(opts: {
  title: string;
  projectId: string;
  task?: boolean;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: opts.title,
    projectId: opts.projectId,
  };
  if (!opts.task) payload.isNote = true;
  return payload;
}

export function buildNotebookPayload(title: string): Record<string, unknown> {
  return { name: title, notebook: true };
}

export const notesMetadata: CommandMeta[] = [
  {
    name: 'notes list',
    description: 'list notes',
    args: [],
    examples: [
      'singularity notes list --json',
      'singularity notes list --project myproject --json',
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
    name: 'notes get',
    description: 'get a note by id',
    args: [],
    examples: ['singularity notes get --id <id> --json'],
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
    name: 'notes create',
    description: 'create a note with Delta content',
    args: [],
    examples: [
      'singularity notes create --content \'[{"insert":"hello\\n"}]\' --title "My Note" --json',
    ],
    outputSchema: null,
    errorCodes: [
      'AUTH_TOKEN_MISSING',
      'AUTH_TOKEN_INVALID',
      'AUTH_FAILED',
      'ADAPTER_UNAVAILABLE',
      'DELTA_INVALID',
      'CONFIG_INVALID',
      'PROFILE_UNKNOWN',
    ],
  },
  {
    name: 'notes notebook-create',
    description: 'create a notebook (project with notebook flag)',
    args: [],
    examples: ['singularity notes notebook-create --title "My Notebook" --json'],
    outputSchema: 'NormalizedProject',
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
    name: 'notes add-item',
    description: 'add a note item (or task) to a project',
    args: [],
    examples: [
      'singularity notes add-item --project myproject --title "My Note" --json',
      'singularity notes add-item --project myproject --title "My Task" --task --json',
    ],
    outputSchema: 'NormalizedTask',
    errorCodes: [
      'AUTH_TOKEN_MISSING',
      'AUTH_TOKEN_INVALID',
      'AUTH_FAILED',
      'ADAPTER_UNAVAILABLE',
      'PROJECT_BINDING_MISSING',
      'PROJECT_ALIAS_UNKNOWN',
      'CONFIG_INVALID',
      'PROFILE_UNKNOWN',
    ],
  },
];

export function createNotesCommand(): Command {
  const notes = new Command('notes').description('manage notes and notebooks');

  const listCmd = new Command('list')
    .description('list notes')
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
      const raw = await adapter.listNotes(params);
      const result = normalizeNoteList(raw);
      output(ctx, result, () => {
        outputSummary(ctx, `${result.items.length} note(s)`);
      });
    });

  const getCmd = new Command('get')
    .description('get a note by id')
    .requiredOption('--id <id>', 'note id')
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
      const raw = await adapter.getNote(id);
      output(ctx, raw, () => {
        const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
        outputSummary(ctx, `${String(r.id ?? id)}  ${String(r.title ?? '')}`);
      });
    });

  const createCmd = new Command('create')
    .description('create a note with Delta content')
    .requiredOption('--content <json>', 'Delta ops array as JSON')
    .option('--title <title>', 'note title')
    .option('--project <id>', 'project id')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(createCmd);
      const opts = createCmd.opts() as {
        content: string;
        title?: string;
        project?: string;
      };
      const payload = buildNotePayload({
        content: opts.content,
        title: opts.title,
        projectId: opts.project,
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
      const raw = await adapter.createNote(payload as unknown as CreateNoteRequest);
      output(ctx, raw, () => {
        const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
        outputSummary(ctx, `created note ${String(r.id ?? '')}`);
      });
    });

  const notebookCreateCmd = new Command('notebook-create')
    .description('create a notebook (project with notebook flag)')
    .requiredOption('--title <title>', 'notebook title')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(notebookCreateCmd);
      const { title } = notebookCreateCmd.opts() as { title: string };
      const payload = buildNotebookPayload(title);
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const raw = await adapter.createProject(payload as never);
      const project = normalizeProject(raw, 'notes notebook-create');
      output(ctx, project, () => {
        outputSummary(ctx, `created notebook ${project.id}  ${project.name}`);
      });
    });

  const addItemCmd = new Command('add-item')
    .description('add a note item (or task) to a project')
    .requiredOption('--project <alias>', 'project alias or id')
    .requiredOption('--title <title>', 'item title')
    .option('--task', 'create as normal task instead of note')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(addItemCmd);
      const opts = addItemCmd.opts() as { project: string; title: string; task?: boolean };
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const destCtx = { ...ctx, project: opts.project };
      const projectId = requireProjectId(destCtx, cfg, profile);
      const payload = buildAddItemPayload({
        title: opts.title,
        projectId,
        task: opts.task,
      });
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const raw = await adapter.createTask(payload as never);
      output(ctx, raw, () => {
        const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
        outputSummary(ctx, `created ${String(r.id ?? '')}  ${opts.title}`);
      });
    });

  notes.addCommand(listCmd);
  notes.addCommand(getCmd);
  notes.addCommand(createCmd);
  notes.addCommand(notebookCreateCmd);
  notes.addCommand(addItemCmd);

  return notes;
}
