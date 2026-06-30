# regression-testing Specification

## Purpose
TBD - created by archiving change close-mvp-api-architecture-gaps. Update Purpose after archive.
## Requirements
### Requirement: P0 adapter contract coverage

Every P0 command SHALL have adapter contract tests using mocked official responses and golden normalized outputs.

#### Scenario: Contract coverage includes task commands

- **WHEN** adapter contract tests run
- **THEN** list/get/create/update/complete/delete/move task operations have success and representative failure coverage

#### Scenario: Contract coverage includes project commands

- **WHEN** adapter contract tests run
- **THEN** list/get/create/update project operations have success and representative failure coverage

### Requirement: MCPB structure tests

Tests SHALL validate the extracted MCPB contains expected entry points, package metadata when available, modules, and callable client/tool exports.

#### Scenario: Required structure is checked

- **WHEN** MCPB structure tests run
- **THEN** they assert `client.js`, `server.js`, `modules/`, `utils/`, and required adapter methods are present and callable

### Requirement: Golden fixture tests

Golden fixtures SHALL cover representative official responses for list projects, get project, list tasks, create task, update task, complete task, notes Delta payload, and habit color validation.

#### Scenario: Fixtures are minimal and normalized

- **WHEN** fixture tests run
- **THEN** each fixture produces the expected normalized output without depending on live Singularity data

### Requirement: JSON snapshot tests

Snapshot tests SHALL assert deterministic JSON output for `commands --json`, `schemas --json`, `version --json`, representative read commands, validation failures, and error envelopes.

#### Scenario: Metadata snapshots are stable

- **WHEN** metadata commands run in tests
- **THEN** their JSON output matches stored snapshots

### Requirement: Skill snapshot tests

Generated Claude skill files SHALL be snapshot-tested and SHALL include all required Singularity API rules.

#### Scenario: Skill snapshots include required rules

- **WHEN** skill snapshot tests run
- **THEN** they fail if base task group, emoji, Delta, timezone, notifications, priority, notebook, habit status, or habit color rules disappear

### Requirement: Upgrade CI workflow

A GitHub Actions workflow SHALL run typecheck, lint, unit tests, adapter tests, snapshot tests, package checks, and MCPB integrity verification on every PR. A manual workflow SHALL accept `upstream_version` or `upstream_url`, run upgrade in an isolated branch/worktree, and execute the regression suite.

#### Scenario: PR validation blocks broken contracts

- **WHEN** a PR changes command contracts, adapter behavior, generated skills, or upstream files without updating tests/specs
- **THEN** CI fails

#### Scenario: Manual upgrade workflow validates candidate

- **WHEN** maintainers trigger the upstream upgrade workflow with a version or URL
- **THEN** CI performs upgrade validation and reports failures without publishing

### Requirement: Optional live smoke tests

Live smoke tests SHALL be gated behind `SINGULARITY_REFRESH_TOKEN` and a disposable project id. They SHALL never run destructive operations against a real default project unless explicitly configured.

#### Scenario: Live tests skip without credentials

- **WHEN** live smoke credentials are absent
- **THEN** live tests are skipped, not failed

#### Scenario: Destructive live test requires disposable project

- **WHEN** a live test would create, update, complete, delete, or archive data
- **THEN** it requires an explicit disposable project id

