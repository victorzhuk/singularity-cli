import * as z from 'zod';

export const NormalizedProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().optional(),
  description: z.string().nullable(),
  emoji: z.string().nullable(),
  baseTaskGroupId: z.string().nullable(),
  showInBasket: z.boolean().optional(),
  archivedAt: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
});

export type NormalizedProject = z.infer<typeof NormalizedProjectSchema>;

export const ProjectListSchema = z.object({
  items: z.array(NormalizedProjectSchema),
  total: z.number().int().optional(),
});

export type ProjectList = z.infer<typeof ProjectListSchema>;
