import * as z from 'zod';

export const NormalizedTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: z.number().int(),
  date: z.string().nullable(),
  useTime: z.boolean(),
  notify: z.number().int(),
  alarmNotify: z.boolean(),
  notifyMinutes: z.array(z.number().int()),
  modifiedDate: z.string(),
  createdDate: z.string(),
  status: z.string(),
  projectId: z.string(),
  isNote: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export type NormalizedTask = z.infer<typeof NormalizedTaskSchema>;

export const TaskListSchema = z.object({
  items: z.array(NormalizedTaskSchema),
  total: z.number().int().optional(),
});

export type TaskList = z.infer<typeof TaskListSchema>;
