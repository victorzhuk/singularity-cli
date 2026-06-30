# authentication Specification

## Purpose
TBD - created by archiving change close-mvp-api-architecture-gaps. Update Purpose after archive.
## Requirements
### Requirement: Token source resolution

Authentication tokens SHALL resolve in this order: `--token`, configured `tokenEnv`, `SINGULARITY_REFRESH_TOKEN`, `REFRESH_TOKEN`, saved config token, interactive login. Tokens SHALL never be printed.

#### Scenario: CLI token wins

- **WHEN** `--token` is supplied and other token sources are present
- **THEN** the command uses the token from `--token`

#### Scenario: Missing token in JSON mode

- **WHEN** no token source is available and the command requires auth in JSON mode
- **THEN** it fails with code `AUTH_TOKEN_MISSING` and does not prompt

### Requirement: API URL resolution

The API URL SHALL default to `https://api.singularity-app.com` and allow override via `--api-url`, `SINGULARITY_API_URL`, profile config, or global config according to the standard resolution order.

#### Scenario: Default API URL is used

- **WHEN** no API URL override exists
- **THEN** authenticated commands use `https://api.singularity-app.com`

#### Scenario: Invalid API URL fails validation

- **WHEN** the resolved API URL is not an absolute HTTP or HTTPS URL
- **THEN** the command fails with `VALIDATION_FAILED`

### Requirement: Global config and secret storage

The system SHALL store global non-secret config at `~/.config/singularity-cli/config.yaml` by default. It SHALL store secrets only when the user explicitly runs `singularity auth login --save-token`.

#### Scenario: Repo config never stores token value

- **WHEN** repo-local config is written by `init` or other commands
- **THEN** it stores token environment variable names or saved token references, not raw token values

#### Scenario: Save token is explicit

- **WHEN** `auth login` runs without `--save-token`
- **THEN** the token is not persisted

### Requirement: Auth commands

The CLI SHALL provide `singularity auth status`, `singularity auth login`, and `singularity auth logout`.

#### Scenario: Auth status validates token

- **WHEN** `auth status --json` runs with a token
- **THEN** it calls a low-risk official client method or health/check endpoint and returns token validity, API URL, profile, and available scope when upstream exposes it

#### Scenario: Auth login validates before saving

- **WHEN** `auth login --save-token` receives a token
- **THEN** it validates the token before writing a saved secret reference

#### Scenario: Auth logout removes saved token

- **WHEN** `auth logout` runs for a profile with a saved token reference
- **THEN** the saved token is removed and non-secret config remains

### Requirement: Auth error mapping

Authentication failures SHALL use stable error codes: `AUTH_TOKEN_MISSING`, `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`, `AUTH_FAILED`, and `AUTH_SCOPE_DENIED`.

#### Scenario: Invalid token maps to auth error

- **WHEN** upstream rejects a token as invalid or expired
- **THEN** the command fails with `AUTH_TOKEN_INVALID` or `AUTH_TOKEN_EXPIRED` when distinguishable, otherwise `AUTH_FAILED`

#### Scenario: Scope denial reports operation

- **WHEN** upstream rejects an operation due insufficient scope
- **THEN** the command fails with `AUTH_SCOPE_DENIED` and details include the requested operation and required entity when known

