# project-scaffold Specification

## Purpose
Define the npm package shape, TypeScript build and type-checking pipeline, lint and test tooling, maintainer scripts, and clean-checkout validation sequence required to publish and maintain a reproducible `singularity` CLI.
## Requirements
### Requirement: npm package with `singularity` binary

The project SHALL be published as an npm package that exposes a `singularity` binary via the `bin` field. The package name SHALL be `singularity-cli`, or the scoped `@victorzhuk/singularity-cli` if the unscoped name is unavailable, while keeping the binary name `singularity`.

#### Scenario: Binary is resolvable after install

- **WHEN** the package is installed (globally or via `npx`) and `singularity --help` is run
- **THEN** the `singularity` binary executes and prints help text without throwing

#### Scenario: Package metadata declares the binary

- **WHEN** `package.json` is inspected
- **THEN** it declares a `bin` entry mapping `singularity` to the built CLI entry point and targets Node.js `>=22`

### Requirement: TypeScript build and type checking

The project SHALL be written in TypeScript and SHALL provide a build that compiles sources to a runnable distributable and a `typecheck` script that fails on type errors.

#### Scenario: Build produces a runnable entry point

- **WHEN** the build script is run on a clean checkout
- **THEN** it exits zero and emits the binary entry point referenced by the `bin` field

#### Scenario: Type checking gates errors

- **WHEN** a type error is introduced and the `typecheck` script runs
- **THEN** the script exits non-zero and reports the offending file and location

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

### Requirement: Maintainer npm scripts

The project SHALL expose npm scripts that alias upstream and test workflows, including `upstream:verify`, so maintainers can run them via package scripts.

#### Scenario: Upstream verify script delegates to the CLI

- **WHEN** `npm run upstream:verify` is executed
- **THEN** it invokes the CLI `upstream verify` command and exits with that command's exit code

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

### Requirement: MVP module architecture

The source tree SHALL separate CLI parsing, config resolution, auth, core validation, adapters, schemas, formatters, skills, and upstream management into dedicated modules. Command handlers SHALL not contain upstream import logic, raw token storage logic, or large payload serialization rules.

#### Scenario: Command handlers stay thin

- **WHEN** command handler files are inspected
- **THEN** they delegate config resolution, auth, validation, adapter calls, and formatting to dedicated modules

#### Scenario: Upstream internals stay isolated

- **WHEN** the source tree is inspected
- **THEN** only upstream runtime/adapter modules require files from the verified MCPB runtime path

### Requirement: Required MVP dependencies

The project SHALL include maintained dependencies for YAML parsing, runtime validation/schema export, and optional human-output color formatting. Dependencies SHALL be justified by an MVP requirement and covered by package/license review before release.

#### Scenario: Config parser dependency exists

- **WHEN** `.singularity-project.yml` support is implemented
- **THEN** the package includes a YAML parser dependency and tests for deterministic parse/write behavior

#### Scenario: Schema generator dependency exists

- **WHEN** `schemas --json` is implemented
- **THEN** schemas are generated or exported from the same runtime validation definitions used by commands

### Requirement: CI and release quality gates

The repository SHALL include CI that runs install, build, typecheck, lint, tests, adapter tests, snapshot tests, OpenSpec validation, package dry-run, and upstream verification on pull requests.

#### Scenario: CI runs full local validation

- **WHEN** a pull request is opened
- **THEN** CI runs the same validation sequence documented for maintainers

#### Scenario: Release requires clean package contents

- **WHEN** a release package is prepared
- **THEN** package contents are checked against the explicit package allowlist

