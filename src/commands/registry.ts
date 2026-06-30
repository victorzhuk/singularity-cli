import type { Command } from 'commander';
import type { CommandMeta } from '../schemas/index.js';
import { createMetaCommand, metaMetadata } from './meta.js';
import { createUpstreamCommand, upstreamMetadata } from './upstream.js';

export const commandRegistry: Array<() => Command | Command[]> = [
  createUpstreamCommand,
  createMetaCommand,
];

export const commandMetadata: CommandMeta[] = [
  ...upstreamMetadata,
  ...metaMetadata,
];
