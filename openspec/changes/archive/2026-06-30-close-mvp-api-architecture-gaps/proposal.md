## Why

The current project is a solid MCPB ingestion spike, but it exposes only `upstream verify` and four read-only adapter methods. The initial PRD requires an agent-first CLI with project config, auth, task/project mutations, metadata, skills, upstream upgrades, and regression gates; those API and architecture surfaces are missing.

## What Changes

- Add the missing P0 CLI surface: global options, `version`, `commands`, `schemas`, `status`, `init`, `config validate`, `auth`, `tasks`, `projects`, `skills`, and upstream `check`/`upgrade`.
- Add strict `.singularity-project.yml` and global config resolution with deterministic validation and token-source precedence.
- Expand the adapter from `list/get` task/project reads to P0 task/project create/update/complete/delete/move operations while keeping all official MCPB access behind the adapter.
- Add domain validation for task dates, notifications, priorities, base task groups, project emoji, `showInBasket`, destructive confirmations, and dry-run semantics.
- Add Claude skill generation from versioned templates with generated-file markers and snapshot tests.
- Add command metadata and JSON Schema export so agents can discover the CLI contract without scraping help text.
- Add upstream check/upgrade and a regression pipeline for future MCPB bumps.
- Record P1 follow-up contracts for notes/notebooks, habits, tags, task groups, search, completions, examples, and SDK boundaries.

## Capabilities

### New Capabilities

- `cli-surface`: Global CLI options, command routing, JSON/human output modes, first-run help, dry-run, and destructive confirmation rules.
- `config-resolution`: Repo-local and global config discovery, schema validation, profile/project alias resolution, and `init`/`config validate` behavior.
- `authentication`: Token-source precedence, auth commands, secret storage policy, API URL resolution, and auth error codes.
- `task-commands`: P0 task list/get/create/update/complete/delete/move commands and Singularity task payload rules.
- `project-commands`: P0 project list/get/create/update commands and Singularity project payload rules.
- `agent-discovery`: `version`, `commands`, and `schemas` metadata for agent discovery and deterministic output contracts.
- `skills-generation`: Template-driven Claude Code skill and slash-command generation with idempotent check mode.
- `upstream-version-management`: Upstream `check`/`upgrade` workflows, lockfile updates, fixture regeneration, and safe failure reporting.
- `regression-testing`: P0 adapter, fixture, JSON snapshot, skill snapshot, package, and optional live-smoke regression gates.
- `p1-objects`: P1 contracts for notes/notebooks, habits, tags, task groups, search, completions, examples, and SDK.

### Modified Capabilities

- `error-model`: Add domain error codes required by config, auth, validation, dry-run, destructive operations, and upstream upgrades.
- `singularity-adapter`: Expand the stable adapter surface and enforce typed operation normalization over official MCPB client/modules.
- `project-scaffold`: Add architecture boundaries, dependency choices, and CI/release expectations needed for the MVP surface.

## Impact

- Affected source areas: new `src/config/`, `src/auth/`, `src/formatters/`, `src/schemas/`, `src/skills/`, expanded `src/commands/`, expanded `src/adapters/singularity/`, and existing `src/core/` and `src/upstream/`.
- New dependencies expected: YAML parser, runtime validator/schema generator, human-output formatting/color library if used, and optional test helpers for package/install smoke tests.
- Test impact: contract tests must cover every P0 command, JSON output snapshots must cover metadata/schema commands, and skill snapshots must cover generated files.
- Runtime behavior: JSON mode remains stdout-only deterministic JSON; warnings/errors/logs stay on stderr; tokens are never printed or written into repo-local config or generated skills.
