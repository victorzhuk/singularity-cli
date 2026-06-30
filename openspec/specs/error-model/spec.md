# error-model Specification

## Purpose
Define the CLI's normalized error envelope, stable foundation error codes, token redaction rules, and exit-code behavior so that every failure — parser errors, command failures, and unexpected internal errors — presents a consistent, safe interface in both human and JSON modes.
## Requirements
### Requirement: Normalized error envelope

The system SHALL represent all command failures with a normalized envelope shaped as `{ "error": { "code": string, "message": string, "details"?: object } }`. In `--json` mode this envelope SHALL be written to stderr only, and stdout SHALL contain no error output. This requirement applies to action failures, Commander parse failures, unknown commands, unknown options, and unexpected internal failures.

#### Scenario: JSON-mode error goes to stderr

- **WHEN** a command fails in `--json` mode
- **THEN** the error envelope is written to stderr and stdout contains no error content

#### Scenario: Envelope always carries a code and message

- **WHEN** any failure is produced
- **THEN** the envelope includes a non-empty `code` and human-readable `message`, with optional structured `details`

#### Scenario: Unknown command in JSON mode is enveloped

- **WHEN** `singularity --json does-not-exist` is run
- **THEN** stderr contains a normalized envelope with code `USAGE_ERROR`
- **AND** stdout is empty
- **AND** the process exits non-zero

#### Scenario: Unknown option in JSON mode is enveloped

- **WHEN** a command is run with an unknown option and `--json`
- **THEN** stderr contains a normalized envelope with code `USAGE_ERROR`
- **AND** no raw Commander error text is printed outside the envelope

### Requirement: Non-zero exit codes on failure

The system SHALL exit with a non-zero status code for any failed operation and exit zero only on success.

#### Scenario: Failure exits non-zero

- **WHEN** a command fails for any reason
- **THEN** the process exits with a non-zero status code

### Requirement: Foundation error codes

The system SHALL define and use stable string error codes for the foundation layer, including at minimum `ADAPTER_UNAVAILABLE`, `UPSTREAM_BREAKING_CHANGE`, `UPSTREAM_SCHEMA_MISMATCH`, `NETWORK_TIMEOUT`, `USAGE_ERROR`, `INTERNAL_ERROR`, and `NOT_IMPLEMENTED`. `NETWORK_TIMEOUT` details SHALL include the timeout in milliseconds. Unknown internal failures SHALL use `INTERNAL_ERROR`, not an unrelated domain code.

#### Scenario: Timeout reports milliseconds

- **WHEN** an operation exceeds its configured timeout
- **THEN** it fails with code `NETWORK_TIMEOUT` and `details` containing the timeout value in milliseconds

#### Scenario: Codes are stable identifiers

- **WHEN** an error code is emitted
- **THEN** it is one of the documented stable string codes, not a free-form message

#### Scenario: Unexpected failure uses internal error

- **WHEN** an unexpected non-`CliError` reaches the top-level handler
- **THEN** JSON mode emits code `INTERNAL_ERROR` with a redacted message
- **AND** it does not emit `ADAPTER_UNAVAILABLE` unless the adapter boundary raised that code

#### Scenario: Placeholder command is explicit

- **WHEN** an advertised command is not implemented
- **THEN** it exits non-zero with code `NOT_IMPLEMENTED`
- **AND** it does not print a success-style placeholder message

### Requirement: Token redaction

The system SHALL redact authentication tokens everywhere they could otherwise appear, including thrown errors, error envelopes, debug logs, and test snapshots. Tokens SHALL never be printed.

#### Scenario: Token redacted in error details

- **WHEN** an error is produced while a token is in scope
- **THEN** the token value is replaced by a redaction marker in the message, details, and any logs

#### Scenario: Debug logs redact tokens

- **WHEN** debug logging is enabled and a request carrying a token is logged
- **THEN** the logged output contains the redaction marker and not the token value

### Requirement: Global JSON mode

The CLI SHALL expose `--json` as a global option that is parsed before command dispatch and applies to all subcommands and parser errors.

#### Scenario: Global JSON before subcommand

- **WHEN** `singularity --json upstream verify` is run
- **THEN** the command uses JSON output mode

#### Scenario: Global JSON after subcommand

- **WHEN** `singularity upstream verify --json` is run
- **THEN** the command uses JSON output mode for backward compatibility

#### Scenario: Help remains human-readable

- **WHEN** help output is requested without `--json`
- **THEN** the CLI prints Commander help text in the human-readable format

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

