## MODIFIED Requirements

### Requirement: Lint and test tooling

The project SHALL provide `lint` and `test` scripts. Tests SHALL run on Vitest, supporting unit, snapshot, and contract test styles. Lint SHALL cover source, tests, scripts, and config files that are part of the repository's maintained code, with Node.js globals configured for JavaScript maintainer scripts. Tests SHALL NOT depend on ignored build artifacts being present before the build step runs.

#### Scenario: Test harness runs

- **WHEN** the `test` script is run after the documented clean-checkout setup
- **THEN** Vitest executes the test suite and reports pass/fail with a non-zero exit on failure

#### Scenario: Tests do not require stale build output

- **WHEN** ignored `dist/` output is absent before the documented build step
- **THEN** the validation flow either builds it before tests that need it or runs those tests against source without failing on missing build artifacts

#### Scenario: Lint script runs

- **WHEN** the `lint` script is run
- **THEN** it checks maintained TypeScript and JavaScript files, reports lint findings, and exits non-zero when violations exist

#### Scenario: Maintainer scripts lint cleanly

- **WHEN** `npm run lint` is executed on a clean checkout
- **THEN** `scripts/bootstrap-upstream.js` and other maintained scripts pass lint or are explicitly excluded with a documented reason

## ADDED Requirements

### Requirement: Clean-checkout validation pipeline

The project SHALL document and automate a clean-checkout validation sequence that runs install, build, typecheck, lint, tests, OpenSpec validation, and package dry-run checks without relying on local ignored files.

#### Scenario: Clean checkout validates

- **WHEN** a maintainer runs the documented validation sequence from a fresh clone after installing dependencies
- **THEN** build, typecheck, lint, tests, OpenSpec validation, and package dry-run checks all exit zero

#### Scenario: Ignored files are not required inputs

- **WHEN** `dist/`, `coverage/`, and `upstream/extracted/` are absent
- **THEN** validation recreates required generated outputs or uses temporary fixtures without requiring committed ignored files

### Requirement: Published package boundary

The npm package SHALL use an explicit allowlist for published files. The package SHALL include the built CLI, declarations, source license, package metadata, `upstream-lock.json`, and the pinned MCPB archive. It SHALL NOT publish tests, OpenSpec files, source TypeScript, local cache directories, or maintainer-only scripts unless intentionally added to the allowlist.

#### Scenario: Package dry-run shows intended files

- **WHEN** `npm pack --dry-run --json` is executed after build
- **THEN** the file list contains the built distributable, package metadata, license, `upstream-lock.json`, and the pinned MCPB archive
- **AND** it does not contain `src/`, `test/`, `openspec/`, `scripts/`, or `upstream/extracted/`

#### Scenario: Package binary is runnable from packed output

- **WHEN** the packed package is installed in a temporary project
- **THEN** the `singularity` binary can run `--help` and `upstream verify --json` without reading files outside the installed package and runtime cache
