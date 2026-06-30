import { Command } from 'commander';
import { resolveToken, resolveApiUrl, saveToken, removeToken, hasSavedToken } from '../auth/index.js';
import { loadResolvedConfig, resolveProfile } from '../config/index.js';
import { contextFromCommand } from '../core/context.js';
import { createSingularityAdapter } from '../adapters/singularity/index.js';
import { output, outputSummary } from '../formatters/index.js';
import type { CommandMeta } from '../schemas/index.js';

export const authMetadata: CommandMeta[] = [
  {
    name: 'auth status',
    description: 'verify token validity against the API',
    args: [],
    examples: ['singularity auth status --json'],
    outputSchema: null,
    errorCodes: [
      'AUTH_TOKEN_MISSING',
      'AUTH_TOKEN_INVALID',
      'AUTH_TOKEN_EXPIRED',
      'AUTH_FAILED',
      'AUTH_SCOPE_DENIED',
      'CONFIG_INVALID',
      'PROFILE_UNKNOWN',
    ],
  },
  {
    name: 'auth login',
    description: 'validate token and optionally persist it to the local secrets store',
    args: [],
    examples: ['singularity auth login --save-token --json'],
    outputSchema: null,
    errorCodes: [
      'AUTH_TOKEN_MISSING',
      'AUTH_TOKEN_INVALID',
      'AUTH_FAILED',
      'AUTH_SCOPE_DENIED',
      'CONFIG_INVALID',
      'PROFILE_UNKNOWN',
    ],
  },
  {
    name: 'auth logout',
    description: 'remove the saved token for the active profile',
    args: [],
    examples: ['singularity auth logout --json'],
    outputSchema: null,
    errorCodes: ['PROFILE_UNKNOWN'],
  },
];

export function createAuthCommand(): Command {
  const auth = new Command('auth').description('manage authentication');

  const statusCmd = new Command('status')
    .description('verify token validity against the API')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(statusCmd);
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      await adapter.authStatus();
      output(ctx, { tokenValid: true, apiUrl, profile: profileName, scope: null }, () => {
        outputSummary(ctx, `authenticated  profile=${profileName}  apiUrl=${apiUrl}`);
      });
    });

  const loginCmd = new Command('login')
    .description('validate token and optionally persist it to the local secrets store')
    .option('--json', 'output JSON')
    .option('--save-token', 'persist the resolved token to the local secrets store')
    .action(async () => {
      const ctx = contextFromCommand(loginCmd);
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName, profile } = resolveProfile(ctx, cfg);
      const apiUrl = resolveApiUrl(ctx, profile);
      const token = await resolveToken(ctx, profile, profileName);
      const adapter = createSingularityAdapter({
        baseUrl: apiUrl,
        accessToken: token,
        requestTimeoutMs: ctx.timeoutMs,
      });
      await adapter.authStatus();
      const { saveToken: doSave } = loginCmd.opts() as { saveToken?: boolean };
      const saved = Boolean(doSave);
      if (saved) {
        saveToken(profileName, token);
      }
      output(ctx, { authenticated: true, saved, profile: profileName }, () => {
        outputSummary(ctx, `authenticated  profile=${profileName}${saved ? '  (token saved)' : ''}`);
      });
    });

  const logoutCmd = new Command('logout')
    .description('remove the saved token for the active profile')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(logoutCmd);
      const cfg = loadResolvedConfig(ctx);
      const { name: profileName } = resolveProfile(ctx, cfg);
      const had = hasSavedToken(profileName);
      removeToken(profileName);
      output(ctx, { loggedOut: true, profile: profileName, hadSavedToken: had }, () => {
        outputSummary(ctx, `logged out  profile=${profileName}${had ? '' : '  (no token was saved)'}`);
      });
    });

  auth.addCommand(statusCmd);
  auth.addCommand(loginCmd);
  auth.addCommand(logoutCmd);

  return auth;
}
