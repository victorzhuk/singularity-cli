# singularity-adapter Specification

## Purpose
Define a stable, testable adapter over the official Singularity MCPB client and modules that loads the verified upstream runtime, enforces request timeouts, normalizes and redacts official API errors, and keeps callers independent of MCPB internals and transport details.
## Requirements
### Requirement: Stable adapter wrapper over official MCPB modules

The system SHALL expose a stable internal adapter interface in `adapters/singularity/` whose methods wrap the official MCPB client/modules. CLI and SDK callers SHALL depend only on the adapter interface, never directly on extracted MCPB internals, so that upstream version bumps are isolated behind the adapter.

#### Scenario: Adapter delegates to official modules

- **WHEN** an adapter method is invoked with valid input
- **THEN** it calls the corresponding official MCPB client/module function and returns a normalized result

#### Scenario: Callers do not import MCPB internals directly

- **WHEN** the source tree is inspected
- **THEN** no CLI or SDK module imports extracted MCPB files directly; all access flows through the adapter

### Requirement: No MCP transport dependency

The adapter SHALL call the official implementation or API client directly and SHALL NOT require JSON-RPC, stdio MCP, HTTP MCP, or any MCP client configuration.

#### Scenario: Adapter works without MCP client

- **WHEN** an adapter method runs with no MCP client configured in the environment
- **THEN** it completes the operation without attempting any MCP transport handshake

### Requirement: Adapter unavailability is explicit

When a required official module or function is not callable, the adapter SHALL fail with the error code `ADAPTER_UNAVAILABLE` identifying the missing capability, rather than silently degrading or inventing a substitute implementation.

#### Scenario: Missing module surfaces ADAPTER_UNAVAILABLE

- **WHEN** an adapter method is invoked but the underlying official module is not callable
- **THEN** the call fails with code `ADAPTER_UNAVAILABLE` and details naming the missing module/function

### Requirement: Golden fixtures and contract tests

The system SHALL store golden fixtures for representative official responses and SHALL provide a contract-test harness that exercises adapter methods against mocked official responses with normalized golden outputs.

#### Scenario: Contract test verifies normalized output

- **WHEN** the contract-test harness runs an adapter method against a stored fixture
- **THEN** the normalized output matches the recorded golden output exactly

#### Scenario: Fixtures cover the foundation surface

- **WHEN** the fixtures directory is inspected
- **THEN** it contains at least one representative fixture for each adapter method introduced in this change

### Requirement: Adapter uses verified upstream runtime

The adapter SHALL load official MCPB files only from a runtime path returned by the shared verified upstream runtime loader. It SHALL NOT extract archives, choose cache paths, or require package-local `upstream/extracted` files directly.

#### Scenario: Adapter loads from verified runtime

- **WHEN** an adapter method is invoked and the upstream runtime is not already loaded
- **THEN** the adapter obtains a verified runtime path from the shared loader before requiring `client.js`

#### Scenario: Adapter does not write package-local extraction output

- **WHEN** an adapter method is invoked in a package install where `upstream/extracted/` is absent
- **THEN** the adapter completes without creating `upstream/extracted/` under the package directory

### Requirement: Adapter calls are timeout-bound

Each official API call made through the adapter SHALL have a configured timeout. When the timeout expires, the adapter SHALL fail with code `NETWORK_TIMEOUT` and details containing `timeoutMs` and the adapter operation name.

#### Scenario: Timed-out task list call

- **WHEN** `listTasks` exceeds the configured timeout
- **THEN** the call rejects with code `NETWORK_TIMEOUT`
- **AND** details include `timeoutMs` and operation `listTasks`

#### Scenario: Timeout is configurable through adapter config

- **WHEN** the adapter is created with a timeout override
- **THEN** official API calls use that timeout instead of the default

### Requirement: Official API errors are normalized and redacted

The adapter SHALL convert official client and HTTP failures into `CliError` instances at the adapter boundary. Error details SHALL include safe fields such as operation, HTTP status, and upstream message, and SHALL NOT include access tokens, Authorization headers, or raw request config.

#### Scenario: HTTP error is normalized

- **WHEN** the official client rejects an adapter call with an HTTP response error
- **THEN** the adapter rejects with a `CliError` whose details include the adapter operation and HTTP status
- **AND** the error does not expose raw upstream client internals

#### Scenario: Token is not leaked from failed request

- **WHEN** an official client error contains an Authorization header or access token in its raw object
- **THEN** the adapter error message and details contain `[REDACTED]` instead of the token value

### Requirement: Adapter contract tests cover failure paths

The adapter contract-test harness SHALL cover successful responses, missing official modules, official HTTP failures, token redaction, and timeout behavior for the adapter methods currently exposed.

#### Scenario: Failure contract tests run

- **WHEN** `npm run test:adapter` is executed
- **THEN** contract tests assert normalized output for successful calls and normalized errors for missing module, HTTP failure, token redaction, and timeout cases

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

