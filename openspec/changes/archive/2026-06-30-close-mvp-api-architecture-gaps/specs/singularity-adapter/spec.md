## ADDED Requirements

### Requirement: P0 adapter operation surface

The adapter SHALL expose stable methods for P0 operations: auth/status check, list/get/create/update/complete/delete/move tasks, list/get/create/update projects, and any low-risk status method needed by `singularity status` or `auth status`.

#### Scenario: Task mutation methods are available

- **WHEN** the adapter is inspected
- **THEN** it exposes stable methods for create, update, complete, delete, and move task operations in addition to read operations

#### Scenario: Project mutation methods are available

- **WHEN** the adapter is inspected
- **THEN** it exposes stable methods for create and update project operations in addition to read operations

### Requirement: Official implementation path is enforced

P0 adapter methods SHALL call official MCPB modules or official MCPB `ApiClient` methods. Direct custom HTTP endpoint logic SHALL be forbidden unless recorded as explicit technical debt with a failing or quarantined contract test.

#### Scenario: Adapter map records official method

- **WHEN** upstream discovery runs
- **THEN** the adapter map records the official source and method for each P0 adapter operation

#### Scenario: Missing official method fails P0 contract

- **WHEN** an official method required for a P0 command is missing or not callable
- **THEN** adapter contract tests fail with `ADAPTER_UNAVAILABLE`

### Requirement: Typed adapter payload builders

The adapter boundary SHALL accept validated, typed domain payloads for task and project operations. It SHALL not accept arbitrary `Record<string, unknown>` for P0 mutation payloads.

#### Scenario: Mutation payload is typed

- **WHEN** TypeScript type checking runs
- **THEN** P0 mutation methods require typed request objects rather than unstructured records

#### Scenario: Unknown fields are rejected before adapter call

- **WHEN** a command supplies a field not accepted by the schema for that operation
- **THEN** validation fails before the adapter method is called

### Requirement: Adapter output normalization

Adapter methods SHALL return normalized outputs that match command JSON schemas. Empty list results SHALL return empty arrays with metadata, not null.

#### Scenario: Empty upstream list normalizes to array

- **WHEN** upstream returns an empty list response
- **THEN** the adapter normalizes it to `items: []` with metadata when applicable

#### Scenario: Missing expected fields reports schema mismatch

- **WHEN** an upstream response lacks fields required by a command output schema
- **THEN** the adapter or service layer fails with `UPSTREAM_SCHEMA_MISMATCH` and details include the command and missing fields
