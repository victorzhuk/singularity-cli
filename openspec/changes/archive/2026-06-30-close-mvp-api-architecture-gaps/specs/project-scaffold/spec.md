## ADDED Requirements

### Requirement: MVP module architecture

The source tree SHALL separate CLI parsing, config resolution, auth, core validation, adapters, schemas, formatters, skills, and upstream management into dedicated modules. Command handlers SHALL not contain upstream import logic, raw token storage logic, or large payload serialization rules.

#### Scenario: Command handlers stay thin

- **WHEN** command handler files are inspected
- **THEN** they delegate config resolution, auth, validation, adapter calls, and formatting to dedicated modules

#### Scenario: Upstream internals stay isolated

- **WHEN** the source tree is inspected
- **THEN** only upstream runtime/adapter modules require files from the verified MCPB runtime path

### Requirement: Required MVP dependencies

The project SHALL include maintained dependencies for YAML parsing, runtime validation/schema export, and optional human-output color formatting. Dependencies SHALL be justified by an MVP requirement and covered by package/license review before release.

#### Scenario: Config parser dependency exists

- **WHEN** `.singularity-project.yml` support is implemented
- **THEN** the package includes a YAML parser dependency and tests for deterministic parse/write behavior

#### Scenario: Schema generator dependency exists

- **WHEN** `schemas --json` is implemented
- **THEN** schemas are generated or exported from the same runtime validation definitions used by commands

### Requirement: CI and release quality gates

The repository SHALL include CI that runs install, build, typecheck, lint, tests, adapter tests, snapshot tests, OpenSpec validation, package dry-run, and upstream verification on pull requests.

#### Scenario: CI runs full local validation

- **WHEN** a pull request is opened
- **THEN** CI runs the same validation sequence documented for maintainers

#### Scenario: Release requires clean package contents

- **WHEN** a release package is prepared
- **THEN** package contents are checked against the explicit package allowlist
