const { existsSync } = require('node:fs');
const { archivePath, extractedDir, lockfilePath } = require('../dist/upstream/paths.js');
const { sha256File } = require('../dist/upstream/hash.js');
const { extractArchive } = require('../dist/upstream/extract.js');
const { discoverUpstream } = require('../dist/upstream/discovery.js');
const { writeLockfile } = require('../dist/upstream/lockfile.js');

const expectedSha256 =
  'adc127b3ac093073dda150f6bc6e4dac401df1836c8ca4b4e0455ed0ce93210d';
const sourceUrl =
  'https://me.singularity-app.com/download/singularity-mcp-server-2.1.1.mcpb';

async function main() {
  if (!existsSync(archivePath)) {
    throw new Error(`archive not found: ${archivePath}`);
  }

  const sha256 = await sha256File(archivePath);
  if (sha256 !== expectedSha256) {
    throw new Error(
      `upstream integrity mismatch: expected ${expectedSha256}, got ${sha256}`,
    );
  }

  await extractArchive(archivePath, extractedDir);
  const discovery = await discoverUpstream(extractedDir, sha256);

  await writeLockfile({
    version: discovery.version,
    sourceUrl,
    downloadedAt: new Date().toISOString(),
    sha256,
    requiredFiles: discovery.requiredFiles,
    discoveredModules: {
      client: discovery.client,
      modules: discovery.modules,
    },
    adapterMap: discovery.adapterMap,
  });

  console.log(`bootstrapped upstream-lock.json: ${lockfilePath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
