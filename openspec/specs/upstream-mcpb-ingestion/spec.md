# upstream-mcpb-ingestion Specification

## Purpose
TBD - created by archiving change bootstrap-cli-mcpb-adapter. Update Purpose after archive.
## Requirements
### Requirement: Pinned MCPB source and integrity verification

The system SHALL pin the official MCPB by source URL and SHA256, defaulting to `https://me.singularity-app.com/download/singularity-mcp-server-2.1.1.mcpb` at version `2.1.1`. The system SHALL verify the downloaded or vendored archive's SHA256 against the pinned value before extraction or use.

#### Scenario: Hash matches pinned value

- **WHEN** the bundled MCPB archive is ingested and its SHA256 matches the pinned value in the lock file
- **THEN** ingestion proceeds to extraction

#### Scenario: Hash mismatch is rejected

- **WHEN** the MCPB archive's computed SHA256 does not match the pinned value
- **THEN** ingestion fails with an integrity error and does NOT extract or execute any archive contents

### Requirement: Archive extraction and required-file validation

The system SHALL extract the MCPB as a zip-compatible archive and SHALL validate that required files and directories are present, including `client.js`, `server.js`, `modules/`, and `utils/`.

#### Scenario: Required files present

- **WHEN** an extracted MCPB contains all required files and directories
- **THEN** validation passes and the discovered file map is recorded

#### Scenario: Required file missing

- **WHEN** an extracted MCPB is missing a required file or directory
- **THEN** validation fails with a precise missing-file report identifying each absent path

### Requirement: Module and function discovery

The system SHALL discover the callable module and function surface exposed by the extracted MCPB (client and `modules/`) and SHALL record the discovered list for use by the adapter and lock file.

#### Scenario: Discovery records callable surface

- **WHEN** discovery runs against a valid extracted MCPB
- **THEN** it produces a deterministic list of discovered modules and their exported functions

### Requirement: Upstream lock file

The system SHALL maintain an `upstream-lock.json` recording at least: source URL, version, `downloadedAt`, SHA256, required files, discovered module list, and the generated adapter map.

#### Scenario: Lock file written on successful ingestion

- **WHEN** ingestion completes successfully
- **THEN** `upstream-lock.json` is written or updated with the source URL, version, SHA256, required files, and discovered module list

#### Scenario: Lock file is deterministic

- **WHEN** ingestion runs twice against the same archive
- **THEN** the resulting `upstream-lock.json` content is byte-identical except for the `downloadedAt` timestamp

### Requirement: `upstream verify` command

The system SHALL provide a `singularity upstream verify` command that runs structural validation against the currently bundled MCPB without changing any files, and SHALL support `--json`. Local structural verification SHALL complete in under 10 seconds excluding download time.

#### Scenario: Verify succeeds for valid bundle

- **WHEN** `singularity upstream verify --json` runs against a valid bundled MCPB
- **THEN** stdout contains deterministic JSON reporting version, SHA256, and a passing structural status, and the process exits zero

#### Scenario: Verify fails for broken bundle

- **WHEN** `singularity upstream verify --json` runs against a bundle missing a required module
- **THEN** it emits an error envelope with code `UPSTREAM_BREAKING_CHANGE` naming the missing module to stderr and exits non-zero

#### Scenario: Verify does not mutate files

- **WHEN** `singularity upstream verify` runs
- **THEN** no files on disk are created, modified, or deleted

