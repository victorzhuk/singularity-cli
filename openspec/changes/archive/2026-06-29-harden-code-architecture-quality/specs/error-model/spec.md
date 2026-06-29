## MODIFIED Requirements

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

## ADDED Requirements

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
