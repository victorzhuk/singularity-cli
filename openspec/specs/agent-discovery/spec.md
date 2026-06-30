# agent-discovery Specification

## Purpose
TBD - created by archiving change close-mvp-api-architecture-gaps. Update Purpose after archive.
## Requirements
### Requirement: Version metadata command

`singularity version --json` SHALL return CLI version, bundled MCPB version, Node version, platform, official package source URL, and MCPB SHA256 without initializing the upstream API client.

#### Scenario: Version metadata is deterministic

- **WHEN** `version --json` is executed twice on the same build
- **THEN** stdout contains byte-stable JSON except for fields explicitly documented as runtime-specific

#### Scenario: Version command avoids upstream client init

- **WHEN** `version --json` runs
- **THEN** it reads local package/lock metadata and does not construct the official API client

### Requirement: Command metadata command

`singularity commands --json` SHALL return every supported command with description, required args, optional args, examples, output schema name, and possible error codes.

#### Scenario: Commands metadata covers all commands

- **WHEN** `commands --json` runs
- **THEN** each public command in Commander help has a metadata entry

#### Scenario: Metadata is schema-linked

- **WHEN** a command metadata entry declares an output schema name
- **THEN** `schemas --json` contains a schema with that name

### Requirement: Schema export command

`singularity schemas --json` SHALL return JSON Schema definitions for command outputs, config file shape, error envelope, and common Singularity objects.

#### Scenario: Schemas are deterministic

- **WHEN** `schemas --json` is executed twice on the same build
- **THEN** stdout contains byte-stable JSON

#### Scenario: Error schema matches envelope

- **WHEN** the schemas output is inspected
- **THEN** it contains the normalized error envelope schema with stable error code enum values

### Requirement: Metadata commands are agent-safe

`version`, `commands`, and `schemas` SHALL not require auth, project config, or upstream API connectivity.

#### Scenario: Metadata works without token

- **WHEN** no token or config file is available
- **THEN** `version --json`, `commands --json`, and `schemas --json` exit zero

