import * as z from 'zod';
import { ConfigV1Schema } from './config.js';
import { ErrorEnvelopeSchema } from './errorEnvelope.js';
import { NormalizedProjectSchema, ProjectListSchema } from './project.js';
import { NormalizedTaskSchema, TaskListSchema } from './task.js';

const VersionInfoSchema = z.object({
  version: z.string(),
  upstream: z.object({
    sha256: z.string(),
    version: z.string(),
  }).optional(),
});

const CommandMetadataSchema = z.object({
  description: z.string(),
  name: z.string(),
  options: z.array(z.object({
    description: z.string().optional(),
    flags: z.string(),
  })).optional(),
  subcommands: z.array(z.object({
    description: z.string(),
    name: z.string(),
  })).optional(),
});

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
