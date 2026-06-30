import type { ExecutionContext } from '../core/context.js';
import type { ProfileConfig } from '../schemas/config.js';
import { validateApiUrl } from '../core/validators.js';

const DEFAULT_API_URL = 'https://api.singularity-app.com';

export function resolveApiUrl(ctx: ExecutionContext, profile?: ProfileConfig): string {
  const url =
    ctx.apiUrl ??
    process.env['SINGULARITY_API_URL'] ??
    profile?.apiUrl ??
    DEFAULT_API_URL;

  validateApiUrl(url);
  return url;
}
