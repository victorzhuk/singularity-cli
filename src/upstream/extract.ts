import { mkdir } from 'node:fs/promises';
import extract from 'extract-zip';

export async function extractArchive(
  archivePath: string,
  targetDir: string,
): Promise<void> {
  await mkdir(targetDir, { recursive: true });
  await extract(archivePath, { dir: targetDir });
}
