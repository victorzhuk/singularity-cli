import type { Command } from 'commander';
import { createUpstreamCommand } from './upstream.js';

export const commandRegistry: Array<() => Command> = [createUpstreamCommand];
