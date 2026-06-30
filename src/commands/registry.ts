import type { Command } from 'commander';
import type { CommandMeta } from '../schemas/index.js';
import { createAuthCommand, authMetadata } from './auth.js';
import { createCompletionCommand, completionMetadata } from './completion.js';
import { createConfigCommand, configMetadata, createInitCommand, initMetadata } from './config.js';
import { createHabitsCommand, habitsMetadata } from './habits.js';
import { createMetaCommand, metaMetadata } from './meta.js';
import { createNotesCommand, notesMetadata } from './notes.js';
import { createProjectsCommand, projectsMetadata } from './projects.js';
import { createSearchCommand, searchMetadata } from './search.js';
import { createSkillsCommand, skillsMetadata } from './skills.js';
import { createTagsCommand, tagsMetadata } from './tags.js';
import { createTaskGroupsCommand, taskGroupsMetadata } from './taskgroups.js';
import { createTasksCommand, tasksMetadata } from './tasks.js';
import { createUpstreamCommand, upstreamMetadata } from './upstream.js';

export const commandRegistry: Array<() => Command | Command[]> = [
  createUpstreamCommand,
  createMetaCommand,
  createInitCommand,
  createConfigCommand,
  createAuthCommand,
  createProjectsCommand,
  createTasksCommand,
  createSkillsCommand,
  createNotesCommand,
  createHabitsCommand,
  createTagsCommand,
  createTaskGroupsCommand,
  createSearchCommand,
  createCompletionCommand,
];

export const commandMetadata: CommandMeta[] = [
  ...upstreamMetadata,
  ...metaMetadata,
  ...initMetadata,
  ...configMetadata,
  ...authMetadata,
  ...projectsMetadata,
  ...tasksMetadata,
  ...skillsMetadata,
  ...notesMetadata,
  ...habitsMetadata,
  ...tagsMetadata,
  ...taskGroupsMetadata,
  ...searchMetadata,
  ...completionMetadata,
];
