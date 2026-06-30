## Context

Current implementation status:

- CLI exposes `upstream verify`; `upstream check` and `upstream upgrade` are hidden `NOT_IMPLEMENTED` commands.
- Only global option is `--json`; PRD-required `--cwd`, `--config`, `--profile`, `--project`, `--token`, `--api-url`, `--timeout-ms`, and `--no-color` are missing.
- Adapter wraps only `listTasks`, `getTask`, `listProjects`, and `getProject` from the official `ApiClient`.
- There is no `.singularity-project.yml` discovery, YAML parsing, config merge, auth command, task/project command layer, command metadata, schemas export, skill generator, or CI workflow.
- Current tests validate ingestion/runtime hardening, package boundary, and four adapter reads; they do not cover P0 command contracts from the PRD.

The existing architecture is a good foundation for MCPB verification and adapter isolation. The next change should build the product surface on top of it without bypassing the adapter or weakening JSON/error contracts.

## Goals / Non-Goals

**Goals:**

- Implement the P0 agent-facing CLI surface from the initial PRD.
- Keep official MCPB code as the source of API behavior.
- Add strict config/auth resolution before mutating upstream data.
- Make every command discoverable through metadata and schemas.
- Add regression gates that protect JSON compatibility, generated skills, and upstream version bumps.

**Non-Goals:**

- No hosted backend.
- No MCP transport or new MCP server.
- No broad P2 automation such as batch/watch mode in this change.
- No custom REST endpoint implementation for P0 operations unless an adapter gap is recorded as explicit technical debt.

## Decisions

**Decision: Add an execution context layer between Commander and command handlers.**
Rationale: every command needs the same global options, cwd/config/profile/project resolution, JSON mode, timeout, token, and formatter. Handlers should receive a resolved context instead of reading `process.env` or `process.cwd()` directly. Alternative: parse options in each command; rejected because resolution order will drift.

**Decision: Keep command handlers thin and adapter-first.**
Rationale: command files should parse/validate arguments, build a domain request, call a service/adapter, and format output. Singularity payload rules live in core validators/builders, not in Commander actions. Alternative: put payload logic in command actions; rejected because it blocks SDK reuse and test isolation.

**Decision: Use Zod-style runtime schemas as the source of JSON contracts.**
Rationale: the PRD requires `schemas --json`, deterministic outputs, validation errors, and command metadata. One schema source should validate inputs/outputs and feed schema export. Alternative: hand-written JSON schemas; rejected because they will drift from TypeScript types and validators.

**Decision: Treat `.singularity-project.yml` as a strict project binding.**
Rationale: wrong aliases or base task groups can mutate the wrong Singularity project. Validation must run before mutations and surface precise remediation. Alternative: permissive best-effort config; rejected due data-loss risk.

**Decision: Generate skills from templates, not command-handler strings.**
Rationale: Claude skills are part of the product contract and must be snapshot-tested. Templates make versioning, check mode, and generated markers explicit.

**Decision: Split P0 and P1 objects.**
Rationale: tasks/projects/config/auth/metadata/skills/upstream are MVP blockers. Notes, notebooks, habits, tags, task groups, search, completions, examples, and SDK need contracts now but can be implemented after P0 foundations are stable.

## Architecture

Target source layout:

- `src/cli.ts`: root Commander wiring, global options, exit override.
- `src/commands/`: thin command definitions for each command group.
- `src/core/`: errors, redaction, validation helpers, date/time and payload rules.
- `src/config/`: local/global config discovery, parsing, merging, validation, and init writer.
- `src/auth/`: token resolution, saved-secret abstraction, auth status/login/logout.
- `src/adapters/singularity/`: stable official MCPB client/module wrapper with typed operation methods.
- `src/formatters/`: JSON and concise human output; no logs on stdout in JSON mode.
- `src/schemas/`: input/output schemas and JSON Schema export.
- `src/skills/`: versioned templates, generated-file markers, check/regenerate logic.
- `src/upstream/`: existing runtime loader plus check/upgrade workflow.

## Risks / Trade-offs

- **Official MCPB methods may not cover a P0 operation cleanly.** → Fail adapter contract tests with `ADAPTER_UNAVAILABLE` and document any direct REST fallback as technical debt before shipping.
- **Command surface is large for one change.** → Implement in phases: context/config/auth, metadata/version/schemas, read commands, mutating task/project commands, skills, upstream upgrade, regression CI.
- **Config mistakes can mutate wrong projects.** → Require alias validation, base task group checks, explicit destructive flags, and dry-run where possible.
- **Generated skills can become stale.** → Include template version, MCPB version, CLI version, generated markers, and snapshot tests.
- **Human output can pollute agent mode.** → Formatters must use a single response path; JSON mode writes only JSON to stdout and all warnings to stderr.

## Migration Plan

1. Add context/config/auth foundations without enabling mutating commands.
2. Add metadata commands (`version`, `commands`, `schemas`) so agents can discover the contract early.
3. Expand adapter and contract fixtures for P0 task/project operations.
4. Add read commands, then mutating commands behind strict validation.
5. Add skill generation and snapshots.
6. Add upstream check/upgrade and CI workflow.
7. Validate with full regression suite and optional live smoke tests against a disposable project.

Rollback is reverting this change; existing `upstream verify` remains the minimal usable command.
