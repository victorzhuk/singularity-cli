import * as z from 'zod';
import { ConfigV1Schema } from './config.js';
import { ErrorEnvelopeSchema } from './errorEnvelope.js';
import { NormalizedProjectSchema, ProjectListSchema } from './project.js';
import { NormalizedTaskSchema, TaskListSchema } from './task.js';

const VersionInfoSchema = z.object({
  cliVersion: z.string(),
  mcpbVersion: z.string(),
  mcpbSha256: z.string(),
  packageSourceUrl: z.string(),
  nodeVersion: z.string(),
  platform: z.string(),
});

const CommandMetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
  args: z.array(z.object({
    name: z.string(),
    required: z.boolean(),
    description: z.string(),
  })),
  examples: z.array(z.string()),
  outputSchema: z.string().nullable(),
  errorCodes: z.array(z.string()),
});

export type CommandMeta = z.infer<typeof CommandMetadataSchema>;

export function allSchemas(): Record<string, unknown> {
  const entries: Array<[string, unknown]> = [
    ['CommandMetadata', z.toJSONSchema(CommandMetadataSchema)],
    ['ConfigV1', z.toJSONSchema(ConfigV1Schema)],
    ['ErrorEnvelope', z.toJSONSchema(ErrorEnvelopeSchema)],
    ['NormalizedProject', z.toJSONSchema(NormalizedProjectSchema)],
    ['NormalizedTask', z.toJSONSchema(NormalizedTaskSchema)],
    ['ProjectList', z.toJSONSchema(ProjectListSchema)],
    ['TaskList', z.toJSONSchema(TaskListSchema)],
    ['VersionInfo', z.toJSONSchema(VersionInfoSchema)],
  ];
  return Object.fromEntries(entries);
}

export {
  ConfigV1Schema,
  ErrorEnvelopeSchema,
  NormalizedProjectSchema,
  NormalizedTaskSchema,
  ProjectListSchema,
  TaskListSchema,
};
export type { ConfigV1, ProfileConfig, ProjectAliasConfig } from './config.js';
export type { ErrorEnvelope } from './errorEnvelope.js';
export type { NormalizedProject, ProjectList } from './project.js';
export type { NormalizedTask, TaskList } from './task.js';
