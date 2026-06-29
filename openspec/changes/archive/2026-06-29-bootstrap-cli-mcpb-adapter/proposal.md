## Why

`singularity-cli` must wrap the official `singularity-mcp-server-2.1.1.mcpb` package and call its modules directly instead of reimplementing Singularity API semantics. The riskiest unknown is whether the official MCPB internals are stable and callable as a library rather than only as MCP tool registrations. Per the PRD, implementation MUST start with a spike that ingests the MCPB, maps its modules, identifies callable functions, and proves an adapter strategy before any feature breadth is built. Everything else (config, commands, skills, upstream upgrades) depends on this foundation.

## What Changes

- Stand up the TypeScript/Node.js 22+ project scaffold: npm package with a `singularity` binary placeholder, build tooling, lint, typecheck, and the Vitest test harness.
- Add upstream MCPB ingestion: download/vendor the pinned `singularity-mcp-server-2.1.1.mcpb`, verify its SHA256, extract it as a zip-compatible archive, validate required files (`client.js`, `server.js`, `modules/`, `utils/`), discover its module/function surface, and write `upstream-lock.json`.
- Add `singularity upstream verify` as the first real command, performing structural validation against the bundled MCPB without mutating files.
- Build the adapter foundation in `adapters/singularity/`: a stable internal wrapper interface over the discovered official client/modules, with explicit `ADAPTER_UNAVAILABLE` failure when a required module is not callable, plus golden fixtures and a contract-test harness.
- Establish the shared error model: a normalized `{ error: { code, message, details } }` envelope, the foundational error codes used by ingestion and the adapter, and token redaction.

## Capabilities

### New Capabilities

- `project-scaffold`: npm package layout, binary entry, build/lint/typecheck tooling, and the Vitest test harness that all later work depends on.
- `upstream-mcpb-ingestion`: download, integrity verification, extraction, required-file validation, module discovery, lock file, and `upstream verify`.
- `singularity-adapter`: stable wrapper methods over the official MCPB client/modules, `ADAPTER_UNAVAILABLE` handling, fixtures, and contract tests.
- `error-model`: normalized error envelope, foundational error codes, exit-code mapping, and token redaction.

### Modified Capabilities

<!-- None. This is the first change in a greenfield repository. -->

## Impact

- New repository tooling: `package.json`, `tsconfig.json`, lint config, Vitest config, build config.
- New source trees: `src/upstream/`, `src/adapters/singularity/`, `src/core/` (error model), `test/fixtures/upstream/`.
- New pinned third-party artifact: vendored/extracted MCPB plus `upstream-lock.json`. MCPB is treated as executable third-party code and pinned by hash.
- No hosted backend; talks to SingularityApp only through the official MCPB layer. No MCP transport dependency is introduced.
