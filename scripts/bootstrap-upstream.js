const { existsSync, rmSync } = require('node:fs');
const { archivePath, lockfilePath } = require('../dist/upstream/paths.js');
const { sha256File } = require('../dist/upstream/hash.js');
const { extractAndDiscover } = require('../dist/upstream/runtime.js');
const { writeLockfile } = require('../dist/upstream/lockfile.js');
const { UpstreamSchemaMismatchError } = require('../dist/core/errors.js');

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
    throw new UpstreamSchemaMismatchError('upstream archive sha256 mismatch', {
      expected: expectedSha256,
      actual: sha256,
    });
  }

  const { tempDir, discovery } = await extractAndDiscover(archivePath, sha256);
  try {
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
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  console.log(`bootstrapped upstream-lock.json: ${lockfilePath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
