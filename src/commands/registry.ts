import type { Command } from 'commander';
import type { CommandMeta } from '../schemas/index.js';
import { createConfigCommand, configMetadata } from './config.js';
import { createMetaCommand, metaMetadata } from './meta.js';
import { createUpstreamCommand, upstreamMetadata } from './upstream.js';

export const commandRegistry: Array<() => Command | Command[]> = [
  createUpstreamCommand,
  createMetaCommand,
  createConfigCommand,
];

export const commandMetadata: CommandMeta[] = [
  ...upstreamMetadata,
  ...metaMetadata,
  ...configMetadata,
];
