## MODIFIED Requirements

### Requirement: Pinned MCPB source and integrity verification

The system SHALL pin the official MCPB by source URL and SHA256, defaulting to `https://me.singularity-app.com/download/singularity-mcp-server-2.1.1.mcpb` at version `2.1.1`. The system SHALL verify the downloaded or vendored archive's SHA256 against the pinned value before extraction, discovery, adapter loading, or execution.

#### Scenario: Hash matches pinned value

- **WHEN** the bundled MCPB archive is ingested and its SHA256 matches the pinned value in the lock file
- **THEN** ingestion proceeds to extraction

#### Scenario: Hash mismatch is rejected

- **WHEN** the MCPB archive's computed SHA256 does not match the pinned value
- **THEN** ingestion fails with an integrity error and does NOT extract or execute any archive contents

#### Scenario: Adapter runtime use is hash-gated

- **WHEN** the adapter needs an extracted MCPB runtime and no valid cache exists
- **THEN** it verifies the archive SHA256 against the lock file before extracting or requiring MCPB files

### Requirement: Upstream lock file

The system SHALL maintain an `upstream-lock.json` recording at least: source URL, version, `downloadedAt`, SHA256, required files, discovered module list, and the generated adapter map. The system SHALL validate the lock file shape at runtime before using its values.

#### Scenario: Lock file written on successful ingestion

- **WHEN** ingestion completes successfully
- **THEN** `upstream-lock.json` is written or updated with the source URL, version, SHA256, required files, and discovered module list

#### Scenario: Lock file is deterministic

- **WHEN** ingestion runs twice against the same archive
- **THEN** the resulting `upstream-lock.json` content is byte-identical except for the `downloadedAt` timestamp

#### Scenario: Invalid lock file shape is rejected

- **WHEN** `upstream-lock.json` is missing required fields, contains invalid field types, or has an empty SHA256/version
- **THEN** the operation fails with code `UPSTREAM_SCHEMA_MISMATCH` before archive extraction or adapter loading

### Requirement: `upstream verify` command

The system SHALL provide a `singularity upstream verify` command that runs structural validation against the currently bundled MCPB without changing project or cache files, and SHALL support `--json`. Local structural verification SHALL complete in under 10 seconds excluding download time.

#### Scenario: Verify succeeds for valid bundle

- **WHEN** `singularity upstream verify --json` runs against a valid bundled MCPB
- **THEN** stdout contains deterministic JSON reporting version, SHA256, and a passing structural status, and the process exits zero

#### Scenario: Verify fails for broken bundle

- **WHEN** `singularity upstream verify --json` runs against a bundle missing a required module
- **THEN** it emits an error envelope with code `UPSTREAM_BREAKING_CHANGE` naming the missing module to stderr and exits non-zero

#### Scenario: Verify does not mutate files

- **WHEN** `singularity upstream verify` runs
- **THEN** no files on disk are created, modified, or deleted except for a temporary directory that is removed before the process exits

#### Scenario: Verify cleans temporary files on failure

- **WHEN** `singularity upstream verify` fails after creating a temporary extraction directory
- **THEN** the temporary directory is removed before the process exits

## ADDED Requirements

### Requirement: Shared verified upstream runtime

The system SHALL expose one upstream runtime loader used by adapter loading, verification helpers, and maintainer bootstrap code. The loader SHALL validate the lock file, verify archive SHA256, extract archives, validate required files, discover callable modules, and return the extracted runtime path.

#### Scenario: All runtime callers use the loader

- **WHEN** the source tree is inspected
- **THEN** adapter loading, verification helpers, and bootstrap code call the shared runtime loader rather than duplicating extraction and verification logic

#### Scenario: Extraction is never direct from adapter code

- **WHEN** adapter code needs `client.js`
- **THEN** it receives a verified runtime path from the shared loader and does not call `extractArchive` directly

### Requirement: Runtime cache outside package tree

The system SHALL store extracted MCPB runtime files in a cache directory outside the installed package tree. The cache path SHALL be keyed by MCPB version and SHA256 and SHALL allow `SINGULARITY_CLI_CACHE_DIR` to override the default platform cache location.

#### Scenario: Package tree remains immutable during adapter use

- **WHEN** an adapter method runs in an installed package
- **THEN** no files are created, modified, or deleted under the installed package directory

#### Scenario: Cache key isolates upstream versions

- **WHEN** the pinned MCPB version or SHA256 changes
- **THEN** the runtime loader uses a different extracted cache directory

### Requirement: Atomic extraction and stale cache recovery

The runtime loader SHALL extract into a temporary directory, validate discovery, then atomically promote the result into the version/SHA cache directory. It SHALL detect missing or corrupt cache contents and rebuild them from the verified archive.

#### Scenario: Partial extraction is not reused

- **WHEN** a previous extraction left a partial cache directory
- **THEN** the runtime loader removes or ignores it and builds a valid cache from the verified archive

#### Scenario: Concurrent extraction reuses completed cache

- **WHEN** two processes request the same runtime cache concurrently
- **THEN** at most one completed cache directory is used and temporary directories are cleaned up
