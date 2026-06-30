## ADDED Requirements

### Requirement: Upstream check command

`singularity upstream check --json` SHALL compare the bundled MCPB version and SHA256 with the configured upstream source without modifying files.

#### Scenario: Check reports current version

- **WHEN** the bundled version matches the configured upstream source
- **THEN** stdout reports current bundled version, source URL, SHA256, and update availability as false

#### Scenario: Check reports available update

- **WHEN** a newer or different upstream MCPB is available
- **THEN** stdout reports the candidate version or URL and its SHA256 when known

### Requirement: Upstream upgrade command

`singularity upstream upgrade --to <version|url>` SHALL download a new MCPB package, verify archive structure, calculate SHA256, update the upstream lock file and bundled archive, regenerate adapter fixtures, and print next-step test commands.

#### Scenario: Upgrade writes new lockfile

- **WHEN** upgrade succeeds
- **THEN** `upstream-lock.json` records the new source URL, version, downloadedAt, SHA256, required files, discovered modules, and adapter map

#### Scenario: Upgrade prints validation commands

- **WHEN** upgrade succeeds
- **THEN** human output and JSON output include next-step commands for verify, typecheck, lint, tests, adapter tests, and snapshot tests

### Requirement: Upgrade safe failure

If an upstream bump removes or renames required files, modules, or adapter methods, upgrade SHALL fail with `UPSTREAM_BREAKING_CHANGE` and a precise missing item report.

#### Scenario: Missing adapter method fails upgrade

- **WHEN** the candidate MCPB lacks a required P0 adapter method
- **THEN** upgrade fails with `UPSTREAM_BREAKING_CHANGE` and details name the missing method

#### Scenario: Failed upgrade does not replace bundle

- **WHEN** upgrade validation fails
- **THEN** the existing bundled MCPB archive and lock file remain unchanged

### Requirement: Maintainer script aliases

The package SHALL provide maintainer scripts for upstream check, upgrade, verify, and adapter tests.

#### Scenario: Upstream check script delegates

- **WHEN** `npm run upstream:check` runs
- **THEN** it invokes `singularity upstream check` and exits with that command's status

#### Scenario: Upstream upgrade script forwards arguments

- **WHEN** `npm run upstream:upgrade -- --to 2.1.2` runs
- **THEN** it invokes `singularity upstream upgrade --to 2.1.2`
