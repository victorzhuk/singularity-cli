## 1. Tooling and package quality gates

- [x] 1.1 Add an explicit npm package allowlist so `npm pack --dry-run --json` excludes `src/`, `test/`, `openspec/`, `scripts/`, and `upstream/extracted/` while including `dist/`, package metadata, license, `upstream-lock.json`, and the pinned MCPB archive
- [x] 1.2 Fix ESLint coverage for maintained JavaScript scripts and config files; `npm run lint` must pass on `scripts/bootstrap-upstream.js` or document an intentional exclusion
- [x] 1.3 Add a clean validation script or documented command sequence that runs build, typecheck, lint, tests, OpenSpec validation, and package dry-run checks
- [x] 1.4 Make tests independent of stale ignored output by either building `dist/` before CLI integration tests or running CLI tests against source through a controlled runner
- [x] 1.5 Add a package-install smoke test that installs the packed tarball into a temp project and runs `singularity --help` plus `singularity upstream verify --json`

## 2. CLI error contract

- [x] 2.1 Add stable error codes/classes for `USAGE_ERROR`, `INTERNAL_ERROR`, and `NOT_IMPLEMENTED`
- [x] 2.2 Make `--json` a global option while preserving `singularity upstream verify --json` compatibility
- [x] 2.3 Configure Commander `exitOverride` and a single error presenter so unknown commands/options emit normalized JSON envelopes in JSON mode
- [x] 2.4 Change unexpected non-`CliError` handling from `ADAPTER_UNAVAILABLE` to `INTERNAL_ERROR`
- [x] 2.5 Remove `upstream check`/`upstream upgrade` from public help or make them fail non-zero with `NOT_IMPLEMENTED`
- [x] 2.6 Add tests for parser errors, placeholder commands, stdout/stderr separation, and human-mode error output

## 3. Verified upstream runtime loader

- [x] 3.1 Add runtime validation for `upstream-lock.json`; invalid shape must fail with `UPSTREAM_SCHEMA_MISMATCH` before extraction
- [x] 3.2 Implement a shared upstream runtime loader that validates the lock, verifies SHA256, extracts, validates required files, discovers modules, and returns the verified runtime path
- [x] 3.3 Move extracted runtime files to a cache outside the package tree, keyed by MCPB version and SHA256, with `SINGULARITY_CLI_CACHE_DIR` override support
- [x] 3.4 Make extraction atomic: extract into a temp directory, validate discovery, promote to cache, and clean temp directories in success and failure paths
- [x] 3.5 Detect stale or partial cache directories and rebuild them from the verified archive
- [x] 3.6 Refactor `upstream verify`, `scripts/bootstrap-upstream.js`, tests, and adapter loading to use the shared loader or its no-cache verification mode
- [x] 3.7 Add tests proving hash mismatch prevents extraction, verify cleans temp directories on failure, adapter use does not write under the package directory, and concurrent calls reuse a valid cache

## 4. Adapter hardening

- [x] 4.1 Extend `SingularityAdapterConfig` with a defaulted request timeout and pass it to the official client request layer or wrapper
- [x] 4.2 Wrap official client calls so timeout failures become `NETWORK_TIMEOUT` with `timeoutMs` and operation details
- [x] 4.3 Normalize official HTTP/client failures into token-safe `CliError` instances with safe operation/status details
- [x] 4.4 Ensure adapter error messages and details redact access tokens and Authorization headers before reaching CLI output or snapshots
- [x] 4.5 Expand contract tests to cover missing method, HTTP failure, timeout, and token redaction paths for existing task/project adapter methods

## 5. Test isolation and spec hygiene

- [x] 5.1 Replace tests that rename tracked files such as `upstream-lock.json` with temp-dir fixtures or injected paths
- [x] 5.2 Ensure test runs cannot race on shared mutable repository files when Vitest runs files in parallel
- [x] 5.3 Keep `upstream/extracted/` out of test setup unless a test explicitly covers legacy cleanup
- [x] 5.4 Update active spec `Purpose` sections that still contain archive placeholders while touching the affected specs

## 6. Validation

- [x] 6.1 Run `npm run build`
- [x] 6.2 Run `npm run typecheck`
- [x] 6.3 Run `npm run lint`
- [x] 6.4 Run `npm test` and `npm run test:adapter`
- [x] 6.5 Run `npm pack --dry-run --json` and verify the package boundary
- [x] 6.6 Run `openspec validate harden-code-architecture-quality --strict`
- [x] 6.7 Run `openspec validate --all --strict --no-interactive`
