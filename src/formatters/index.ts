import type { ExecutionContext } from '../core/context.js';
import { outputJson } from './json.js';

export { outputJson, outputJsonError } from './json.js';
export { colorize, outputSummary, outputTable, warnStderr } from './human.js';

export function output(ctx: ExecutionContext, json: unknown, human: () => void): void {
  if (ctx.json) {
    outputJson(json);
  } else {
    human();
  }
}
