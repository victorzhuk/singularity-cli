import { Command } from 'commander';
import { resolveApiUrl, resolveToken } from '../auth/index.js';
import { loadResolvedConfig, resolveProfile } from '../config/index.js';
import { contextFromCommand } from '../core/context.js';
import { ValidationFailedError } from '../core/errors.js';
import { validateEmoji } from '../core/validators.js';
import {
  createSingularityAdapter,
  type CreateProjectRequest,
  type UpdateProjectRequest,
} from '../adapters/singularity/index.js';
import { normalizeProject, normalizeProjectList } from '../adapters/singularity/normalize.js';
import { output, outputSummary, outputTable } from '../formatters/index.js';
import type { CommandMeta } from '../schemas/index.js';

export interface CreateProjectOptions {
  title: string;
  parent?: string;
  description?: string;
  emoji?: string;
  notebook?: boolean;
  showInBasket?: boolean;
}

export interface UpdateProjectOptions {
  title?: string;
  description?: string;
  emoji?: string;
  archive?: boolean;
  showInBasket?: boolean;
}

export function buildCreateProjectPayload(opts: CreateProjectOptions): Record<string, unknown> {
  const payload: Record<string, unknown> = { name: opts.title };
  if (opts.parent !== undefined) payload.parentId = opts.parent;
  if (opts.description !== undefined) payload.description = opts.description;
  if (opts.emoji !== undefined) payload.emoji = validateEmoji(opts.emoji);
  if (opts.notebook) payload.notebook = true;
  if (opts.showInBasket) payload.showInBasket = true;
  return payload;
}

export function buildUpdateProjectPayload(
  id: string,
  opts: UpdateProjectOptions,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { id };
  if (opts.title !== undefined) payload.name = opts.title;
  if (opts.description !== undefined) payload.description = opts.description;
  if (opts.emoji !== undefined) payload.emoji = validateEmoji(opts.emoji);
  if (opts.archive !== undefined) payload.archive = opts.archive;
  if (opts.showInBasket !== undefined) payload.showInBasket = opts.showInBasket;

  if (Object.keys(payload).length <= 1) {
    throw new ValidationFailedError('no fields to update', { field: 'payload' });
  }

  return payload;
}

export const projectsMetadata: CommandMeta[] = [
  {
    name: 'projects list',
    description: 'list projects',
    args: [],
    examples: [
      'singularity projects list --json',
      'singularity projects list --archived --json',
    ],
    outputSchema: 'ProjectList',
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
    name: 'projects get',
    description: 'get a project by id',
    args: [],
    examples: ['singularity projects get --id <id> --json'],
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
    name: 'projects create',
    description: 'create a new project',
    args: [],
    examples: [
      'singularity projects create --title "My Project" --json',
      'singularity projects create --title "My Project" --emoji 🚀 --dry-run --json',
    ],
    outputSchema: 'NormalizedProject',
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
    name: 'projects update',
    description: 'update a project',
    args: [],
    examples: [
      'singularity projects update --id <id> --title "New Title" --json',
      'singularity projects update --id <id> --archive --json',
    ],
    outputSchema: 'NormalizedProject',
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
];

export function createProjectsCommand(): Command {
  const projects = new Command('projects').description('manage projects');

  const listCmd = new Command('list')
    .description('list projects')
    .option('--archived', 'include archived projects')
    .option('--deleted', 'include deleted/removed projects')
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
      const { archived, deleted } = listCmd.opts() as {
        archived?: boolean;
        deleted?: boolean;
      };
      const raw = await adapter.listProjects({
        includeArchived: !!archived,
        includeRemoved: !!deleted,
      });
      const result = normalizeProjectList(raw, 'projects list');
      output(ctx, result, () => {
        outputTable(
          ctx,
          ['ID', 'NAME', 'EMOJI', 'PARENT'],
          result.items.map((p) => [p.id, p.name, p.emoji ?? '', p.parentId ?? '']),
        );
      });
    });

  const getCmd = new Command('get')
    .description('get a project by id')
    .requiredOption('--id <id>', 'project id')
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
      const raw = await adapter.getProject(id);
      const project = normalizeProject(raw, 'projects get');
      output(ctx, project, () => {
        outputSummary(ctx, `${project.id}  ${project.name}  ${project.emoji ?? ''}`);
      });
    });

  const createCmd = new Command('create')
    .description('create a new project')
    .requiredOption('--title <title>', 'project title')
    .option('--parent <id>', 'parent project id')
    .option('--description <text>', 'project description')
    .option('--emoji <char>', 'emoji character or hex codepoint')
    .option('--notebook', 'mark as notebook')
    .option('--show-in-basket', 'show in basket')
    .option('--dry-run', 'preview payload without calling API')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(createCmd);
      const opts = createCmd.opts() as {
        title: string;
        parent?: string;
        description?: string;
        emoji?: string;
        notebook?: boolean;
        showInBasket?: boolean;
      };
      const payload = buildCreateProjectPayload({
        title: opts.title,
        parent: opts.parent,
        description: opts.description,
        emoji: opts.emoji,
        notebook: opts.notebook,
        showInBasket: opts.showInBasket,
      });
      if (ctx.dryRun) {
        output(
          ctx,
          { dryRun: true, operation: 'projects create', payload },
          () => { outputSummary(ctx, `[dry-run] would create project: ${opts.title}`); },
        );
        return;
      }
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const raw = await adapter.createProject(payload as unknown as CreateProjectRequest);
      const project = normalizeProject(raw, 'projects create');
      output(ctx, project, () => {
        outputSummary(ctx, `created ${project.id}  ${project.name}`);
      });
    });

  const updateCmd = new Command('update')
    .description('update a project')
    .requiredOption('--id <id>', 'project id')
    .option('--title <title>', 'new title')
    .option('--description <text>', 'new description')
    .option('--emoji <char>', 'emoji character or hex codepoint')
    .option('--archive', 'archive the project (--no-archive to unarchive)')
    .option('--show-in-basket', 'show in basket')
    .option('--dry-run', 'preview payload without calling API')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(updateCmd);
      const opts = updateCmd.opts() as {
        id: string;
        title?: string;
        description?: string;
        emoji?: string;
        archive?: boolean;
        showInBasket?: boolean;
      };
      const payload = buildUpdateProjectPayload(opts.id, {
        title: opts.title,
        description: opts.description,
        emoji: opts.emoji,
        archive: opts.archive,
        showInBasket: opts.showInBasket,
      });
      if (ctx.dryRun) {
        output(
          ctx,
          { dryRun: true, operation: 'projects update', payload },
          () => { outputSummary(ctx, `[dry-run] would update project: ${opts.id}`); },
        );
        return;
      }
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const raw = await adapter.updateProject(payload as unknown as UpdateProjectRequest);
      const project = normalizeProject(raw, 'projects update');
      output(ctx, project, () => {
        outputSummary(ctx, `updated ${project.id}  ${project.name}`);
      });
    });

  projects.addCommand(listCmd);
  projects.addCommand(getCmd);
  projects.addCommand(createCmd);
  projects.addCommand(updateCmd);

  return projects;
}
