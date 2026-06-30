import type { Command } from 'commander';
import type { CommandMeta } from '../schemas/index.js';
import { createAuthCommand, authMetadata } from './auth.js';
import { createConfigCommand, configMetadata } from './config.js';
import { createMetaCommand, metaMetadata } from './meta.js';
import { createProjectsCommand, projectsMetadata } from './projects.js';
import { createSkillsCommand, skillsMetadata } from './skills.js';
import { createTasksCommand, tasksMetadata } from './tasks.js';
import { createUpstreamCommand, upstreamMetadata } from './upstream.js';

export const commandRegistry: Array<() => Command | Command[]> = [
  createUpstreamCommand,
  createMetaCommand,
  createConfigCommand,
  createAuthCommand,
  createProjectsCommand,
  createTasksCommand,
  createSkillsCommand,
];

export const commandMetadata: CommandMeta[] = [
  ...upstreamMetadata,
  ...metaMetadata,
  ...configMetadata,
  ...authMetadata,
  ...projectsMetadata,
  ...tasksMetadata,
  ...skillsMetadata,
];
