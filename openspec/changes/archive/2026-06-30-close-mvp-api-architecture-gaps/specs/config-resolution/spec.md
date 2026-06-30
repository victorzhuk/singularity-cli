## ADDED Requirements

### Requirement: Project file discovery

The system SHALL discover `.singularity-project.yml` from the resolved cwd or nearest parent directory unless `--config <path>` is provided.

#### Scenario: Nearest parent config is used

- **WHEN** a command runs inside a repository subdirectory and no `--config` is supplied
- **THEN** the nearest ancestor `.singularity-project.yml` is loaded

#### Scenario: Explicit config path wins

- **WHEN** `--config <path>` is supplied
- **THEN** that file is loaded instead of walking parent directories

### Requirement: Config schema

Repo-local config SHALL support version, default profile, default project, named profiles, project aliases, and skill settings matching the initial PRD shape. The parser SHALL reject unknown major versions and invalid field types.

#### Scenario: Valid project binding parses

- **WHEN** a config file contains version `1`, profiles, projects, and skill settings with valid types
- **THEN** config validation succeeds and returns normalized config data

#### Scenario: Invalid YAML is rejected

- **WHEN** the config file is not valid YAML or has invalid field types
- **THEN** validation fails with code `CONFIG_INVALID`

### Requirement: Resolution order

Command values SHALL resolve in this order: explicit CLI flags, environment variables, `.singularity-project.yml`, global config, command defaults.

#### Scenario: CLI flag overrides config

- **WHEN** config sets a default project and `--project` is supplied
- **THEN** the command uses the project from `--project`

#### Scenario: Environment overrides project file for API URL

- **WHEN** `SINGULARITY_API_URL` is set and config also contains `apiUrl`
- **THEN** the command uses `SINGULARITY_API_URL` unless `--api-url` is supplied

### Requirement: Project alias resolution

Project-scoped commands SHALL resolve `--project` and default project aliases to API project ids using `.singularity-project.yml`. Unknown aliases SHALL fail before any upstream call.

#### Scenario: Known alias resolves

- **WHEN** `--project main` matches a configured project alias
- **THEN** the execution context uses that project's API id and project defaults

#### Scenario: Unknown alias is reported

- **WHEN** `--project unknown` does not match a configured alias and is not accepted as a raw id by command policy
- **THEN** the command fails with code `PROJECT_ALIAS_UNKNOWN` and details list valid aliases

### Requirement: Profile resolution

The resolver SHALL support named profiles with API URL, token environment variable name, timezone, optional saved token reference, default project alias, and default base task group id.

#### Scenario: Default profile is used

- **WHEN** no `--profile` is supplied and config defines `defaultProfile`
- **THEN** that profile is used for API URL, token source, timezone, and defaults

#### Scenario: Unknown profile fails

- **WHEN** a requested profile is missing
- **THEN** the command fails with code `PROFILE_UNKNOWN`

### Requirement: Config validation command

`singularity config validate --json` SHALL validate YAML structure, profile references, project aliases, timezone format, base task group fields, skill output settings, and token availability without mutating upstream data.

#### Scenario: Config validate returns normalized report

- **WHEN** config validation succeeds in JSON mode
- **THEN** stdout contains a deterministic report with resolved config path, profile names, project aliases, and token availability status without token values

#### Scenario: Config validate does not mutate

- **WHEN** `config validate` runs
- **THEN** no upstream mutation methods are called and no config files are written

### Requirement: Init command

`singularity init` SHALL create `.singularity-project.yml`, validate auth, select a default project, and optionally generate Claude skills. In JSON mode it SHALL not prompt interactively.

#### Scenario: Human init writes config

- **WHEN** `singularity init` completes in human mode
- **THEN** `.singularity-project.yml` is written with version `1`, selected profile, project alias, token env name, timezone, and skill settings

#### Scenario: JSON init requires explicit inputs

- **WHEN** `singularity init --json` lacks required non-interactive inputs
- **THEN** it fails with `VALIDATION_FAILED` and does not prompt
