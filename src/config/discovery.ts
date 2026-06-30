import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { ExecutionContext } from '../core/context.js';

export function findRepoConfig(ctx: ExecutionContext): string | undefined {
  if (ctx.configPath) return ctx.configPath;

  let dir = ctx.cwd;
  while (true) {
    const candidate = path.join(dir, '.singularity-project.yml');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export function globalConfigPath(): string {
  const xdg = process.env['XDG_CONFIG_HOME'];
  const base = xdg ?? path.join(os.homedir(), '.config');
  return path.join(base, 'singularity-cli', 'config.yaml');
}
