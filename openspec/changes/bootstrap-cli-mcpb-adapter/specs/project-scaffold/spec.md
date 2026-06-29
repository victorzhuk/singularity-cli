## ADDED Requirements

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

The project SHALL provide `lint` and `test` scripts. Tests SHALL run on Vitest, supporting unit, snapshot, and contract test styles.

#### Scenario: Test harness runs

- **WHEN** the `test` script is run on a clean checkout
- **THEN** Vitest executes the test suite and reports pass/fail with a non-zero exit on failure

#### Scenario: Lint script runs

- **WHEN** the `lint` script is run
- **THEN** it reports lint findings and exits non-zero when violations exist

### Requirement: Maintainer npm scripts

The project SHALL expose npm scripts that alias upstream and test workflows, including `upstream:verify`, so maintainers can run them via package scripts.

#### Scenario: Upstream verify script delegates to the CLI

- **WHEN** `npm run upstream:verify` is executed
- **THEN** it invokes the CLI `upstream verify` command and exits with that command's exit code
