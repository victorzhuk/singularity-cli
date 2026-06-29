## Context

`singularity-cli` is a greenfield, agent-first CLI that wraps the official `singularity-mcp-server-2.1.1.mcpb` package. The product contract is that we reuse official Singularity implementation paths (the MCPB client/modules) rather than reinventing API semantics, while exposing deterministic CLI commands with no MCP transport.

The dominant risk, called out in the PRD's Technical Considerations, is that the MCPB internals may be structured for MCP tool registration rather than clean library imports. We cannot build feature breadth (tasks, projects, habits, notes, skills) until we have proven we can call official modules behind a stable adapter. This change is that spike plus the minimum foundation needed to make the proof durable: scaffold, ingestion, adapter, and error model.

Constraints: Node.js 22+, TypeScript, Vitest, Commander.js (later), Zod (later). MCPB is third-party executable code pinned by SHA256. No hosted backend. No tokens persisted or logged.

## Goals / Non-Goals

**Goals:**

- Prove the official MCPB can be ingested, verified, extracted, and its modules discovered deterministically.
- Establish a stable adapter boundary so later commands and future upstream bumps are isolated from MCPB internals.
- Ship `upstream verify` as the first end-to-end command exercising scaffold + ingestion + error model + JSON output.
- Lay down the shared error envelope, exit-code mapping, and token redaction that every later command reuses.
- Provide the test harness (unit, snapshot, contract) and golden fixtures that regression-protect upstream bumps.

**Non-Goals:**

- No task/project/habit/note/skill commands (later changes).
- No `.singularity-project.yml` config resolution, profiles, or auth commands (later change).
- No `upstream check`/`upstream upgrade` download-and-bump workflow beyond the lock-file format and `verify` (later change).
- No CLI command metadata (`commands`/`schemas`) breadth beyond what `upstream verify` needs.
- No skill generation.

## Decisions

**Decision: Vendor the verified extracted MCPB into the repo rather than download at build time.**
Rationale: deterministic, offline-friendly builds and CI; treats MCPB as a pinned dependency. The download path is still implemented for the future `upstream upgrade` workflow, but the bundled artifact is the source of truth for builds. Alternative considered: download-on-build — rejected for non-determinism and network coupling in CI.

**Decision: Verify SHA256 before any extraction or execution.**
Rationale: MCPB is executable third-party code; integrity must gate use. Alternative: verify after extraction — rejected because extraction itself is attack surface.

**Decision: Single stable adapter interface in `adapters/singularity/`; nothing else imports MCPB internals.**
Rationale: isolates upstream churn behind one seam, making version bumps low-risk and testable via contract tests. Alternative: call MCPB modules directly from command handlers — rejected; it spreads upstream coupling everywhere and defeats regression isolation.

**Decision: Adapter fails loud with `ADAPTER_UNAVAILABLE` when a module is not callable.**
Rationale: the PRD requires P0 commands to fail tests before release if modules are not callable; silent fallbacks would mask breaking upstream changes and risk inventing wrong API behavior.

**Decision: Error model is a foundation capability, not per-command.**
Rationale: every command shares the `{ error: { code, message, details } }` envelope, exit-code mapping, and redaction. Centralizing avoids drift and guarantees the "no logs on stdout in JSON mode" rule.

**Decision: Lazy-load MCPB modules.**
Rationale: metadata-only commands (`version`, `help`, future `commands`/`schemas`) must not initialize the upstream client. The adapter loads modules only when a method needs them.

## Risks / Trade-offs

- **MCPB modules are not cleanly importable (CJS side effects, MCP-only registration).** → Adapter abstracts the load strategy; if direct import fails, the documented fallback is to call the same official client methods the MCP tools use. Any direct REST fallback is recorded as technical debt and must fail P0 contract tests rather than ship silently.
- **MCPB license/distribution may restrict vendoring the extracted package.** → Open question below; ingestion supports both vendored and download-then-verify paths so the decision can flip without redesign.
- **SHA256 of the upstream artifact may change without a version bump.** → `upstream verify` reports mismatch as an integrity failure; the lock file records the pinned hash so drift is detectable.
- **Discovery output non-determinism (key ordering).** → Discovery sorts modules/functions deterministically; lock file is byte-stable except for `downloadedAt`.

## Migration Plan

Greenfield; no migration. Rollout is the initial scaffold commit. Rollback is reverting the change. The bundled MCPB and `upstream-lock.json` are committed together so the foundation is reproducible.

## Open Questions

- Does the MCPB license permit committing the extracted package into the repository, or must we download-and-verify at install/build time?
- Are the official `modules/` exports callable as plain functions, or do they require a constructed client/context object? (Resolved by the discovery spike; informs the adapter load strategy.)
- Is the package name `singularity-cli` available on npm, or do we publish under `@victorzhuk/singularity-cli`?
