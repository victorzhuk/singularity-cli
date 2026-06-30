import { describe, expect, it } from 'vitest';
import { renderSkill, GENERATED_MARKER } from '../../src/skills/renderer.js';

const REQUIRED_KEYWORDS = [
  'baseTaskGroupId',
  'emoji',
  'showInBasket',
  'Delta',
  'useTime',
  'timezone',
  'notify',
  'priority',
  'isNote',
  'status: 0',
  '#ff6b6b',
];

describe('renderSkill', () => {
  it('content matches snapshot after stripping version-stamp lines', async () => {
    const { content } = await renderSkill();
    const stripped = content
      .replace(/^cli_version:.*$/m, 'cli_version: STRIPPED')
      .replace(/^mcpb_version:.*$/m, 'mcpb_version: STRIPPED');
    expect(stripped).toMatchSnapshot();
  });

  it('contains all required rule keywords', async () => {
    const { content } = await renderSkill();
    for (const kw of REQUIRED_KEYWORDS) {
      expect(content, `missing keyword: ${kw}`).toContain(kw);
    }
  });

  it('contains the GENERATED_MARKER', async () => {
    const { content } = await renderSkill();
    expect(content).toContain(GENERATED_MARKER);
  });
});
