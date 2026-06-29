import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');

export const upstreamDir = path.join(repoRoot, 'upstream');
export const archivePath = path.join(
  upstreamDir,
  'singularity-mcp-server-2.1.1.mcpb',
);
export const lockfilePath = path.join(repoRoot, 'upstream-lock.json');
