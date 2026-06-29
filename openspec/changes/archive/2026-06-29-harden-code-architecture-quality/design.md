## Context

The repository is a TypeScript/Node.js 22 CLI that wraps a pinned Singularity MCPB archive. The current implementation proves the happy path, but several foundation paths are brittle:

- `npm run lint` fails on `scripts/bootstrap-upstream.js`.
- Tests call `dist/cli.js`, so a clean checkout without `dist/` fails until build runs.
- One test renames `upstream-lock.json`, which can race with other tests and leaves the repo damaged on crash.
- `npm pack --dry-run` publishes source, tests, OpenSpec files, and scripts because there is no explicit package allowlist.
- Commander parse errors bypass the normalized JSON error envelope.
- The adapter can extract and execute the MCPB without first checking SHA256, writes extraction output under the package tree, and has no timeout/error normalization around official API calls.
- `upstream verify` removes its temp directory only on success.

## Goals / Non-Goals

**Goals:**

- Make clean-checkout validation deterministic: install, build, typecheck, lint, test, OpenSpec validate, and package dry-run.
- Keep published npm packages small and intentional.
- Make `--json` a real global CLI mode for all command and parse failures.
- Centralize upstream archive verification/extraction behind one runtime loader.
- Keep runtime writes out of the installed package directory.
- Ensure adapter failures are timeout-bound and token-safe.

**Non-Goals:**

- No new task/project/habit/note commands.
- No broad adapter method expansion beyond existing task/project methods.
- No replacement of the official MCPB implementation.
- No hosted service or MCP transport.

## Decisions

**Decision: Add a package allowlist instead of relying on `.gitignore`.**
Rationale: `npm pack` currently includes development artifacts. A `files` allowlist in `package.json` is explicit and testable. Alternative: `.npmignore`; rejected because it is easier to drift from `bin`, lockfile, and vendored archive needs.

**Decision: Use a shared `UpstreamRuntime` service for every extraction/use path.**
Rationale: hash verification, lockfile validation, extraction, discovery, cleanup, and cache path selection belong in one module. Alternative: keep verification in each caller; rejected because the adapter already missed the hash gate.

**Decision: Cache extracted MCPB by version and SHA outside the package tree.**
Rationale: installed packages can be read-only, and runtime writes under `node_modules` break pnpm/Nix/global installs. Use `SINGULARITY_CLI_CACHE_DIR` when set, otherwise the platform cache directory (`XDG_CACHE_HOME` on Linux, `LOCALAPPDATA` on Windows, `~/Library/Caches` on macOS, with `os.tmpdir()` fallback). Alternative: commit extracted files; rejected due package size and third-party dependency noise.

**Decision: Extract atomically.**
Rationale: crashes and concurrent CLI calls can leave partial caches. Extract to a temp directory, run discovery, then rename into the SHA-keyed cache directory. If the final directory already exists, discard the temp directory and reuse the existing cache.

**Decision: Convert Commander errors into `CliError`.**
Rationale: parser failures are user-visible command failures and must follow the JSON contract. Add a global `--json`, `exitOverride`, and a single error presenter. Alternative: local `--json` per command; rejected because unknown command/option errors happen before command actions.

**Decision: Make placeholder commands fail explicitly or hide them.**
Rationale: `upstream check` and `upstream upgrade` currently exit zero while doing nothing. Until implemented, they should either be removed from help or emit `NOT_IMPLEMENTED` with a non-zero exit.

**Decision: Adapter wraps official API errors at the boundary.**
Rationale: Axios errors can carry request config and headers. The adapter must convert them to token-safe `CliError` details, preserve status/operation information, and enforce timeouts. Alternative: let command handlers normalize raw errors; rejected because it leaks upstream/client details through every caller.

## Risks / Trade-offs

- **Cache migration leaves old `upstream/extracted/` directories in developer checkouts.** → Add cleanup guidance and keep `.gitignore` until old directories disappear.
- **Atomic extraction is more code than direct `extractArchive`.** → Keep the service small and cover it with unit tests using temp directories.
- **Global `--json` changes parser output.** → Preserve human stderr for non-JSON mode and snapshot JSON envelopes.
- **Timeout wrapping may hide raw Axios error details.** → Store only safe fields: operation, status, timeoutMs, and upstream error code/message when non-sensitive.

## Migration Plan

1. Add the runtime loader and move adapter/verify/bootstrap paths onto it.
2. Update tests to use temp fixtures and dependency injection instead of mutating tracked files.
3. Add package allowlist and packaging tests.
4. Run `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm pack --dry-run --json`, and `openspec validate harden-code-architecture-quality --strict`.
5. Remove any local `upstream/extracted/` cache from developer machines after the new cache path is in use.

Rollback is reverting this change; the committed MCPB archive and lockfile remain unchanged.

## Open Questions

- Should `upstream check` and `upstream upgrade` stay visible as explicit `NOT_IMPLEMENTED` commands, or be hidden until implemented?
- Should the default adapter timeout be fixed globally or configurable per future profile?
