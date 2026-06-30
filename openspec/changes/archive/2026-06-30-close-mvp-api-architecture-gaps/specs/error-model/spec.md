## ADDED Requirements

### Requirement: Domain error codes

The system SHALL define stable error codes for MVP domain failures: `AUTH_TOKEN_MISSING`, `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`, `AUTH_FAILED`, `AUTH_SCOPE_DENIED`, `CONFIG_INVALID`, `PROFILE_UNKNOWN`, `PROJECT_BINDING_MISSING`, `PROJECT_ALIAS_UNKNOWN`, `BASE_TASK_GROUP_MISSING`, `VALIDATION_FAILED`, `DELTA_INVALID`, `UNSUPPORTED_DRY_RUN`, `CONFIRMATION_REQUIRED`, and `GENERATED_FILE_COLLISION`.

#### Scenario: Config failure uses config code

- **WHEN** configuration parsing or validation fails
- **THEN** the emitted error code is `CONFIG_INVALID` or a more specific config-related code

#### Scenario: Validation failure reports fields

- **WHEN** input validation fails
- **THEN** the error envelope uses `VALIDATION_FAILED` and details include the invalid field paths when available

### Requirement: Error details are safe and actionable

Error details SHALL include remediation data when useful, such as valid project aliases, allowed habit colors, missing config path, required confirmation flag, timeout milliseconds, or upstream missing module names. Details SHALL NOT include tokens, raw Authorization headers, raw request config, or full upstream stack traces.

#### Scenario: Alias error lists valid aliases

- **WHEN** a project alias is unknown
- **THEN** error details include known aliases and omit token/config secrets

#### Scenario: Upstream stack is not exposed

- **WHEN** an official client throws with a stack trace
- **THEN** JSON error details omit the raw stack trace

### Requirement: JSON mode suppresses interaction

Commands running in JSON mode SHALL never prompt interactively. Missing required input SHALL fail with a stable error envelope.

#### Scenario: Missing interactive input in JSON mode fails

- **WHEN** `init`, `auth login`, or a mutation command needs input that was not provided in JSON mode
- **THEN** it fails with `VALIDATION_FAILED` or a more specific code and does not prompt
