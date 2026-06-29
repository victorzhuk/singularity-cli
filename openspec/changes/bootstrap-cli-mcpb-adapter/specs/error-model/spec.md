## ADDED Requirements

### Requirement: Normalized error envelope

The system SHALL represent all command failures with a normalized envelope shaped as `{ "error": { "code": string, "message": string, "details"?: object } }`. In `--json` mode this envelope SHALL be written to stderr only, and stdout SHALL contain no error output.

#### Scenario: JSON-mode error goes to stderr

- **WHEN** a command fails in `--json` mode
- **THEN** the error envelope is written to stderr and stdout contains no error content

#### Scenario: Envelope always carries a code and message

- **WHEN** any failure is produced
- **THEN** the envelope includes a non-empty `code` and human-readable `message`, with optional structured `details`

### Requirement: Non-zero exit codes on failure

The system SHALL exit with a non-zero status code for any failed operation and exit zero only on success.

#### Scenario: Failure exits non-zero

- **WHEN** a command fails for any reason
- **THEN** the process exits with a non-zero status code

### Requirement: Foundation error codes

The system SHALL define and use stable string error codes for the foundation layer, including at minimum `ADAPTER_UNAVAILABLE`, `UPSTREAM_BREAKING_CHANGE`, `UPSTREAM_SCHEMA_MISMATCH`, and `NETWORK_TIMEOUT`. `NETWORK_TIMEOUT` details SHALL include the timeout in milliseconds.

#### Scenario: Timeout reports milliseconds

- **WHEN** an operation exceeds its configured timeout
- **THEN** it fails with code `NETWORK_TIMEOUT` and `details` containing the timeout value in milliseconds

#### Scenario: Codes are stable identifiers

- **WHEN** an error code is emitted
- **THEN** it is one of the documented stable string codes, not a free-form message

### Requirement: Token redaction

The system SHALL redact authentication tokens everywhere they could otherwise appear, including thrown errors, error envelopes, debug logs, and test snapshots. Tokens SHALL never be printed.

#### Scenario: Token redacted in error details

- **WHEN** an error is produced while a token is in scope
- **THEN** the token value is replaced by a redaction marker in the message, details, and any logs

#### Scenario: Debug logs redact tokens

- **WHEN** debug logging is enabled and a request carrying a token is logged
- **THEN** the logged output contains the redaction marker and not the token value
