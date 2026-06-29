import { existsSync } from 'node:fs';
import { extractArchive } from '../src/upstream/extract.js';
import { archivePath, extractedDir } from '../src/upstream/paths.js';

export default async function setup(): Promise<void> {
  if (!existsSync(extractedDir)) {
    await extractArchive(archivePath, extractedDir);
  }
}
