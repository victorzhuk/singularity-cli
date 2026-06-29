## Why

The foundation works for the happy path, but review found gaps that can break clean-checkout validation, package publishing, JSON error contracts, and safe upstream runtime loading. These fixes should land before feature breadth so later task/project commands do not inherit unstable tooling and error behavior.

## What Changes

- Make build, lint, test, and package validation reproducible from a clean checkout.
- Add an explicit npm package allowlist so published artifacts exclude source, tests, OpenSpec files, and local tooling unless intentionally shipped.
- Route all CLI failures, including Commander parse errors and placeholder commands, through the normalized error model.
- Replace ad hoc MCPB extraction with a shared verified runtime loader that validates SHA256 before extraction or use, uses an immutable cache outside the package tree, cleans temporary directories, and validates the lock file shape.
- Harden the Singularity adapter with verified upstream loading, call timeouts, token-safe error mapping, and contract tests for failure paths.
- Remove or convert success-exiting placeholder commands into explicit non-implemented errors.

## Capabilities

### New Capabilities

<!-- None. This hardens existing foundation capabilities. -->

### Modified Capabilities

- `project-scaffold`: clean-checkout quality gates, lint coverage, and npm package boundary requirements.
- `error-model`: global JSON-mode errors, parser errors, and stable codes for usage, internal, and not-implemented failures.
- `upstream-mcpb-ingestion`: verified runtime extraction, lockfile schema validation, cache placement, and cleanup guarantees.
- `singularity-adapter`: adapter runtime loading, timeout behavior, and token-safe official API error mapping.

## Impact

- Affected code: `src/cli.ts`, `src/commands/upstream.ts`, `src/upstream/*`, `src/adapters/singularity/*`, `src/core/*`, `scripts/bootstrap-upstream.js`, tests, package metadata, and ESLint config.
- Build/release: `npm run lint` must pass; `npm test` must work after a clean install/build sequence; `npm pack --dry-run` must show only intended files.
- Runtime: adapter extraction moves from `upstream/extracted/` under the package root to a verified cache keyed by MCPB SHA/version.
- API: error envelopes gain stable codes for `USAGE_ERROR`, `INTERNAL_ERROR`, and `NOT_IMPLEMENTED` while preserving existing foundation codes.
