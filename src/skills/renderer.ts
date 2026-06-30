import { cliVersion } from '../core/pkg.js';
import { readLockfile } from '../upstream/lockfile.js';
import { SKILL_TEMPLATE_VERSION, renderSkillMarkdown } from './templates/claude.js';

export const GENERATED_MARKER = 'singularity_generated: true';

export interface RenderedSkill {
  cliVersion: string;
  mcpbVersion: string;
  templateVersion: number;
  content: string;
}

export async function renderSkill(): Promise<RenderedSkill> {
  const cli = cliVersion();
  let mcpb = '0.0.0';
  try {
    const lock = await readLockfile();
    mcpb = lock.version;
  } catch {
    // lockfile unavailable; use placeholder version
  }
  const content = renderSkillMarkdown({
    cliVersion: cli,
    mcpbVersion: mcpb,
    templateVersion: SKILL_TEMPLATE_VERSION,
  });
  return { cliVersion: cli, mcpbVersion: mcpb, templateVersion: SKILL_TEMPLATE_VERSION, content };
}
