## 1. Project scaffold

- [x] 1.1 Initialize `package.json` targeting Node.js `>=22`, with package name `singularity-cli` (fallback `@victorzhuk/singularity-cli`) and a `bin` entry mapping `singularity` to the built entry point
- [x] 1.2 Add `tsconfig.json` and a build setup that compiles `src/` to a runnable distributable referenced by `bin`
- [x] 1.3 Add lint config and a `lint` script; add `typecheck` script that fails on type errors
- [x] 1.4 Add Vitest config and a `test` script supporting unit, snapshot, and contract tests
- [x] 1.5 Create source tree skeleton: `src/upstream/`, `src/adapters/singularity/`, `src/core/`, `test/fixtures/upstream/`
- [x] 1.6 Add maintainer npm scripts including `upstream:verify` (and placeholders `upstream:check`, `upstream:upgrade`, `test:adapter`) that delegate to the CLI
- [x] 1.7 Verify a clean checkout builds, typechecks, lints, and runs `singularity --help` (placeholder entry) without error

## 2. Error model (core)

- [x] 2.1 Define the normalized error envelope type `{ error: { code, message, details? } }`
- [x] 2.2 Define stable foundation error codes: `ADAPTER_UNAVAILABLE`, `UPSTREAM_BREAKING_CHANGE`, `UPSTREAM_SCHEMA_MISMATCH`, `NETWORK_TIMEOUT`
- [x] 2.3 Implement exit-code mapping so failures exit non-zero and success exits zero
- [x] 2.4 Implement JSON-mode output routing: error envelope to stderr only, never stdout
- [x] 2.5 Implement token redaction for messages, error details, and debug logs
- [x] 2.6 Unit-test envelope shape, exit codes, stderr routing, and redaction (including a snapshot proving no token leaks)

## 3. Upstream MCPB ingestion

- [x] 3.1 Vendor the verified `singularity-mcp-server-2.1.1.mcpb` (or implement download path) and record the pinned source URL and SHA256
- [x] 3.2 Implement SHA256 integrity verification that runs before extraction and rejects mismatches
- [x] 3.3 Implement zip-compatible extraction of the MCPB archive
- [x] 3.4 Implement required-file validation for `client.js`, `server.js`, `modules/`, `utils/` with a precise missing-file report
- [x] 3.5 Implement deterministic module/function discovery over the extracted client and `modules/`
- [x] 3.6 Implement `upstream-lock.json` writer recording source URL, version, `downloadedAt`, SHA256, required files, discovered modules, and adapter map
- [x] 3.7 Verify lock file is byte-stable across runs except for `downloadedAt`

## 4. `upstream verify` command

- [x] 4.1 Wire a minimal CLI entry that dispatches `upstream verify` with a `--json` global option
- [x] 4.2 Implement `upstream verify` to run structural validation against the bundled MCPB without mutating files
- [x] 4.3 Emit deterministic JSON (version, SHA256, structural status) to stdout on success; emit `UPSTREAM_BREAKING_CHANGE` envelope to stderr on a missing module
- [x] 4.4 Assert local structural verification completes in under 10 seconds (excluding download)
- [x] 4.5 Add a test proving `upstream verify` creates/modifies/deletes no files

## 5. Singularity adapter foundation

- [x] 5.1 Define the stable adapter interface in `adapters/singularity/` (lazy module loading; no MCP transport)
- [x] 5.2 Implement adapter load strategy over discovered official modules with `ADAPTER_UNAVAILABLE` on non-callable modules
- [x] 5.3 Enforce the boundary: no CLI/SDK module imports MCPB internals directly (add a lint rule or test guard)
- [x] 5.4 Add golden fixtures under `test/fixtures/upstream/` for each adapter method introduced here
- [x] 5.5 Build the contract-test harness that runs adapter methods against mocked official responses and compares normalized golden outputs
- [x] 5.6 Add a contract test asserting `ADAPTER_UNAVAILABLE` is raised when a required module is missing

## 6. Validation

- [x] 6.1 Run `typecheck`, `lint`, and the full `test` suite green on a clean checkout
- [x] 6.2 Run `singularity upstream verify --json` and confirm deterministic stdout and zero exit on the valid bundle
- [x] 6.3 Run `openspec validate bootstrap-cli-mcpb-adapter --strict` and resolve any findings
