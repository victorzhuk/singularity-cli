## ADDED Requirements

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
