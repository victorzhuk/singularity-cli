# cli-surface Specification

## Purpose
TBD - created by archiving change close-mvp-api-architecture-gaps. Update Purpose after archive.
## Requirements
### Requirement: Global options

The CLI SHALL support global options `--cwd <dir>`, `--config <path>`, `--profile <name>`, `--project <id-or-alias>`, `--json`, `--token <token>`, `--api-url <url>`, `--timeout-ms <number>`, and `--no-color`. Global options SHALL be available before or after subcommands where Commander parsing allows it.

#### Scenario: Global options build execution context

- **WHEN** a command is executed with global options
- **THEN** the command handler receives a resolved execution context containing cwd, config path, profile, project, JSON mode, token source, API URL, timeout, and color mode

#### Scenario: Invalid timeout is rejected

- **WHEN** `--timeout-ms` is zero, negative, non-numeric, or outside the supported range
- **THEN** the command fails with code `VALIDATION_FAILED` before any upstream call

### Requirement: Agent JSON output mode

With `--json`, stdout SHALL contain only deterministic JSON for successful commands. Warnings, progress messages, debug logs, and errors SHALL go to stderr.

#### Scenario: JSON success has no extra output

- **WHEN** any command succeeds in JSON mode
- **THEN** stdout contains one deterministic JSON document
- **AND** stdout contains no human table, progress line, warning, or log text

#### Scenario: JSON error keeps stdout empty

- **WHEN** any command fails in JSON mode
- **THEN** stdout is empty and stderr contains the normalized error envelope

### Requirement: Human output mode

Without `--json`, the CLI SHALL render concise human output: compact tables for lists, short summaries for mutations, and plain text that remains useful without color.

#### Scenario: List command renders table

- **WHEN** a read-list command succeeds without `--json`
- **THEN** stdout contains a compact table or summary with no color-only meaning

#### Scenario: Color can be disabled

- **WHEN** `--no-color` is supplied or stdout is not a TTY
- **THEN** human output does not include ANSI color sequences

### Requirement: First-run help

Running `singularity` with no arguments SHALL print help, package version, and recommended next commands: `init`, `auth status`, `config validate`, `commands --json`, and `skills --agent claude`.

#### Scenario: No-argument help

- **WHEN** `singularity` is run with no arguments
- **THEN** it exits zero and prints help with the recommended next commands

### Requirement: Mutating command dry-run

Mutating commands SHALL support `--dry-run` where the official implementation can validate without mutation. If upstream cannot support dry-run safely, the command SHALL fail with `UNSUPPORTED_DRY_RUN`.

#### Scenario: Supported dry-run does not mutate

- **WHEN** a mutating command is run with `--dry-run` and the operation supports validation without mutation
- **THEN** it returns the planned operation and does not call an upstream mutation method

#### Scenario: Unsupported dry-run is explicit

- **WHEN** a mutating command is run with `--dry-run` and safe validation is unavailable
- **THEN** it fails with code `UNSUPPORTED_DRY_RUN`

### Requirement: Destructive confirmation

Destructive commands SHALL require explicit confirmation. Human mode SHALL require `--yes`; JSON mode SHALL require `--yes` or `--force`.

#### Scenario: Delete without confirmation fails

- **WHEN** a delete/archive/destructive command is executed without confirmation
- **THEN** it fails with code `CONFIRMATION_REQUIRED` before any upstream mutation

#### Scenario: Confirmed delete proceeds

- **WHEN** a destructive command is executed with the required confirmation flag
- **THEN** it may call the adapter mutation method

