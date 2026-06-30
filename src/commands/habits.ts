import { Command } from 'commander';
import { resolveApiUrl, resolveToken } from '../auth/index.js';
import { loadResolvedConfig, resolveProfile } from '../config/index.js';
import { contextFromCommand } from '../core/context.js';
import { ValidationFailedError } from '../core/errors.js';
import {
  createSingularityAdapter,
  type CreateHabitRequest,
  type UpdateHabitRequest,
  type CompleteHabitRequest,
} from '../adapters/singularity/index.js';
import { output, outputSummary, outputTable } from '../formatters/index.js';
import type { CommandMeta } from '../schemas/index.js';

// Mirrors the upstream habit palette; single source for color validation.
export const HABIT_COLORS: readonly string[] = [
  'red', 'orange', 'yellow', 'green', 'teal',
  'blue', 'purple', 'pink', 'brown', 'gray',
] as const;

function normalizeHabitList(raw: unknown): { items: unknown[]; total?: number } {
  if (raw === null || raw === undefined) return { items: [] };
  if (Array.isArray(raw)) return { items: raw };
  const r = raw as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items : [];
  const result: { items: unknown[]; total?: number } = { items };
  if (typeof r.total === 'number') result.total = r.total;
  return result;
}

export function validateHabitColor(color: string): void {
  if (!(HABIT_COLORS as readonly string[]).includes(color)) {
    throw new ValidationFailedError(
      `invalid habit color: ${color}`,
      { allowedColors: HABIT_COLORS },
    );
  }
}

export function buildCreateHabitPayload(opts: {
  title: string;
  color?: string;
  status?: number;
}): Record<string, unknown> {
  if (opts.color !== undefined) {
    validateHabitColor(opts.color);
  }
  const payload: Record<string, unknown> = {
    title: opts.title,
    status: opts.status ?? 0,
  };
  if (opts.color !== undefined) payload.color = opts.color;
  return payload;
}

export function buildUpdateHabitPayload(
  id: string,
  opts: { title?: string; color?: string; status?: number },
): Record<string, unknown> {
  if (opts.color !== undefined) {
    validateHabitColor(opts.color);
  }
  const payload: Record<string, unknown> = { id };
  if (opts.title !== undefined) payload.title = opts.title;
  if (opts.color !== undefined) payload.color = opts.color;
  if (opts.status !== undefined) payload.status = opts.status;
  if (Object.keys(payload).length <= 1) {
    throw new ValidationFailedError('no fields to update', { field: 'payload' });
  }
  return payload;
}

export const habitsMetadata: CommandMeta[] = [
  {
    name: 'habits list',
    description: 'list habits',
    args: [],
    examples: ['singularity habits list --json'],
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
    name: 'habits get',
    description: 'get a habit by id',
    args: [],
    examples: ['singularity habits get --id <id> --json'],
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
    name: 'habits create',
    description: 'create a new habit',
    args: [],
    examples: [
      'singularity habits create --title "Meditate" --color blue --json',
      'singularity habits create --title "Exercise" --json',
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
    name: 'habits update',
    description: 'update a habit',
    args: [],
    examples: [
      'singularity habits update --id <id> --title "New Title" --json',
      'singularity habits update --id <id> --color green --json',
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
    name: 'habits complete',
    description: 'mark a habit as complete for today',
    args: [],
    examples: ['singularity habits complete --id <id> --json'],
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
];

export function createHabitsCommand(): Command {
  const habits = new Command('habits').description('manage habits');

  const listCmd = new Command('list')
    .description('list habits')
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
      const raw = await adapter.listHabits();
      const result = normalizeHabitList(raw);
      output(ctx, result, () => {
        outputTable(
          ctx,
          ['ID', 'TITLE', 'COLOR', 'STATUS'],
          result.items.map((h) => {
            const r = (h !== null && typeof h === 'object') ? h as Record<string, unknown> : {};
            return [String(r.id ?? ''), String(r.title ?? ''), String(r.color ?? ''), String(r.status ?? '')];
          }),
        );
      });
    });

  const getCmd = new Command('get')
    .description('get a habit by id')
    .requiredOption('--id <id>', 'habit id')
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
      const raw = await adapter.getHabit(id);
      output(ctx, raw, () => {
        const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
        outputSummary(ctx, `${String(r.id ?? id)}  ${String(r.title ?? '')}`);
      });
    });

  const createCmd = new Command('create')
    .description('create a new habit')
    .requiredOption('--title <title>', 'habit title')
    .option('--color <name>', 'habit color name')
    .option('--status <n>', 'status (0=active, 1=archived)', Number)
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(createCmd);
      const opts = createCmd.opts() as {
        title: string;
        color?: string;
        status?: number;
      };
      const payload = buildCreateHabitPayload({
        title: opts.title,
        color: opts.color,
        status: opts.status,
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
      const raw = await adapter.createHabit(payload as unknown as CreateHabitRequest);
      output(ctx, raw, () => {
        const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
        outputSummary(ctx, `created habit ${String(r.id ?? '')}  ${opts.title}`);
      });
    });

  const updateCmd = new Command('update')
    .description('update a habit')
    .requiredOption('--id <id>', 'habit id')
    .option('--title <title>', 'new title')
    .option('--color <name>', 'new color name')
    .option('--status <n>', 'new status', Number)
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(updateCmd);
      const opts = updateCmd.opts() as {
        id: string;
        title?: string;
        color?: string;
        status?: number;
      };
      const payload = buildUpdateHabitPayload(opts.id, {
        title: opts.title,
        color: opts.color,
        status: opts.status,
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
      const raw = await adapter.updateHabit(payload as unknown as UpdateHabitRequest);
      output(ctx, raw, () => {
        const r = (raw !== null && typeof raw === 'object') ? raw as Record<string, unknown> : {};
        outputSummary(ctx, `updated habit ${String(r.id ?? opts.id)}`);
      });
    });

  const completeCmd = new Command('complete')
    .description('mark a habit as complete for today')
    .requiredOption('--id <id>', 'habit id')
    .option('--date <date>', 'completion date (YYYY-MM-DD, default today)')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(completeCmd);
      const opts = completeCmd.opts() as { id: string; date?: string };
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      const progress: CompleteHabitRequest = { habitId: opts.id };
      if (opts.date) progress.date = opts.date;
      const raw = await adapter.completeHabit(progress);
      output(ctx, raw, () => {
        outputSummary(ctx, `completed habit ${opts.id}`);
      });
    });

  habits.addCommand(listCmd);
  habits.addCommand(getCmd);
  habits.addCommand(createCmd);
  habits.addCommand(updateCmd);
  habits.addCommand(completeCmd);

  return habits;
}
