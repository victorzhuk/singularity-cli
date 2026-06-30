import * as z from 'zod';

const ProfileConfigSchema = z.object({
  apiUrl: z.string().optional(),
  tokenEnv: z.string().optional(),
  timezone: z.string().optional(),
  savedTokenRef: z.string().optional(),
  defaultProject: z.string().optional(),
  defaultBaseTaskGroupId: z.string().optional(),
}).strict();

const ProjectAliasConfigSchema = z.object({
  id: z.string(),
  baseTaskGroupId: z.string().optional(),
  defaultPriority: z.number().int().optional(),
}).strict();

export const ConfigV1Schema = z.object({
  version: z.literal(1),
  defaultProfile: z.string().optional(),
  defaultProject: z.string().optional(),
  profiles: z.record(z.string(), ProfileConfigSchema),
  projects: z.record(z.string(), ProjectAliasConfigSchema),
  skills: z.object({
    claude: z.object({
      outputDir: z.string().optional(),
    }).strict().optional(),
  }).strict().optional(),
}).strict();

export type ConfigV1 = z.infer<typeof ConfigV1Schema>;
export type ProfileConfig = z.infer<typeof ProfileConfigSchema>;
export type ProjectAliasConfig = z.infer<typeof ProjectAliasConfigSchema>;
