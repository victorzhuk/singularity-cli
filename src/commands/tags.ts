import { Command } from 'commander';
import { resolveApiUrl, resolveToken } from '../auth/index.js';
import { loadResolvedConfig, resolveProfile } from '../config/index.js';
import { contextFromCommand } from '../core/context.js';
import { ValidationFailedError } from '../core/errors.js';
import { requireConfirmation } from '../core/guards.js';
import {
  createSingularityAdapter,
  type CreateTagRequest,
  type UpdateTagRequest,
} from '../adapters/singularity/index.js';
import { output, outputSummary, outputTable } from '../formatters/index.js';
import type { CommandMeta } from '../schemas/index.js';

function normalizeTagList(raw: unknown): { items: unknown[]; total?: number } {
  if (raw === null || raw === undefined) return { items: [] };
  if (Array.isArray(raw)) return { items: raw };
  const r = raw as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items : [];
  const result: { items: unknown[]; total?: number } = { items };
  if (typeof r.total === 'number') result.total = r.total;
  return result;
}

export function buildCreateTagPayload(opts: {
  title: string;
  color?: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = { title: opts.title };
  if (opts.color !== undefined) payload.color = opts.color;
  return payload;
}

export function buildUpdateTagPayload(
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

export const tagsMetadata: CommandMeta[] = [
  {
    name: 'tags list',
    description: 'list tags',
    args: [],
    examples: ['singularity tags list --json'],
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
    name: 'tags get',
    description: 'get a tag by id',
    args: [],
    examples: ['singularity tags get --id <id> --json'],
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
    name: 'tags create',
    description: 'create a new tag',
    args: [],
    examples: [
      'singularity tags create --title "urgent" --json',
      'singularity tags create --title "focus" --color blue --json',
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
    name: 'tags update',
    description: 'update a tag',
    args: [],
    examples: [
      'singularity tags update --id <id> --title "renamed" --json',
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
    name: 'tags delete',
    description: 'delete a tag',
    args: [],
    examples: [
      'singularity tags delete --id <id> --yes --json',
      'singularity tags delete --id <id> --force --json',
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

export function createTagsCommand(): Command {
  const tags = new Command('tags').description('manage tags');

  const listCmd = new Command('list')
    .description('list tags')
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
      const raw = await adapter.listTags();
      const result = normalizeTagList(raw);
      output(ctx, result, () => {
        outputTable(
          ctx,
          ['ID', 'TITLE', 'COLOR'],
          result.items.map((t) => {
            const r = (t !== null && typeof t === 'object') ? t as Record<string, unknown> : {};
            return [String(r.id ?? ''), String(r.title ?? ''), String(r.color ?? '')];
          }),
        );
      });
    });

  const getCmd = new Command('get')
    .description('get a tag by id')
    .requiredOption('--id <id>', 'tag id')
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
      const raw = await adapter.getTag(id);
      output(ctx, raw, () => {
        const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
        outputSummary(ctx, `${String(r.id ?? id)}  ${String(r.title ?? '')}`);
      });
    });

  const createCmd = new Command('create')
    .description('create a new tag')
    .requiredOption('--title <title>', 'tag title')
    .option('--color <color>', 'tag color')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(createCmd);
      const opts = createCmd.opts() as { title: string; color?: string };
      const payload = buildCreateTagPayload({ title: opts.title, color: opts.color });
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const raw = await adapter.createTag(payload as unknown as CreateTagRequest);
      output(ctx, raw, () => {
        const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
        outputSummary(ctx, `created tag ${String(r.id ?? '')}  ${opts.title}`);
      });
    });

  const updateCmd = new Command('update')
    .description('update a tag')
    .requiredOption('--id <id>', 'tag id')
    .option('--title <title>', 'new title')
    .option('--color <color>', 'new color')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(updateCmd);
      const opts = updateCmd.opts() as { id: string; title?: string; color?: string };
      const payload = buildUpdateTagPayload(opts.id, { title: opts.title, color: opts.color });
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const raw = await adapter.updateTag(payload as unknown as UpdateTagRequest);
      output(ctx, raw, () => {
        const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
        outputSummary(ctx, `updated tag ${String(r.id ?? opts.id)}`);
      });
    });

  const deleteCmd = new Command('delete')
    .description('delete a tag')
    .requiredOption('--id <id>', 'tag id')
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
      await adapter.deleteTag(id);
      output(ctx, { deleted: true, id }, () => {
        outputSummary(ctx, `deleted tag ${id}`);
      });
    });

  tags.addCommand(listCmd);
  tags.addCommand(getCmd);
  tags.addCommand(createCmd);
  tags.addCommand(updateCmd);
  tags.addCommand(deleteCmd);

  return tags;
}
