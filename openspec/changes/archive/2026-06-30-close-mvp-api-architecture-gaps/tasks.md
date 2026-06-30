## 1. Execution context and CLI surface

- [x] 1.1 Add a shared execution context builder for cwd, config path, profile, project, JSON mode, token source, API URL, timeout, color mode, and dry-run
- [x] 1.2 Add global options `--cwd`, `--config`, `--profile`, `--project`, `--token`, `--api-url`, `--timeout-ms`, and `--no-color`
- [x] 1.3 Add root no-argument help with version and recommended next commands
- [x] 1.4 Add formatter module for deterministic JSON output and concise human tables/summaries
- [x] 1.5 Ensure warnings, progress, and debug logs go to stderr and never stdout in JSON mode
- [x] 1.6 Add destructive confirmation guard for delete/archive operations in human and JSON modes
- [x] 1.7 Add dry-run plumbing and `UNSUPPORTED_DRY_RUN` handling for mutations that cannot validate without writing

## 2. Config resolution

- [x] 2.1 Add YAML parser dependency and config module for `.singularity-project.yml` discovery from cwd/parents
- [x] 2.2 Add global non-secret config path resolution at `~/.config/singularity-cli/config.yaml`
- [x] 2.3 Define runtime schemas for version `1` config, profiles, projects, aliases, skill settings, timezone, and base task group fields
- [x] 2.4 Implement resolution order: CLI flags, environment variables, repo config, global config, command defaults
- [x] 2.5 Implement project alias and profile resolution with `PROJECT_ALIAS_UNKNOWN`, `PROFILE_UNKNOWN`, and `PROJECT_BINDING_MISSING`
- [x] 2.6 Implement `singularity config validate --json` with deterministic token-availability and config report output
- [x] 2.7 Implement `singularity init` for human mode and non-interactive JSON mode validation
- [x] 2.8 Add tests for config discovery, explicit config override, invalid YAML, alias resolution, timezone validation, and no-mutation validation

## 3. Authentication

- [x] 3.1 Implement token resolver with precedence: `--token`, configured `tokenEnv`, `SINGULARITY_REFRESH_TOKEN`, `REFRESH_TOKEN`, saved token reference, interactive login
- [x] 3.2 Implement API URL resolver with default `https://api.singularity-app.com`
- [x] 3.3 Add auth error classes/codes for missing, invalid, expired, failed, and scope-denied auth
- [x] 3.4 Implement `singularity auth status` through a low-risk official client call
- [x] 3.5 Implement `singularity auth login` with optional `--save-token`; do not persist secrets by default
- [x] 3.6 Implement `singularity auth logout` for saved token references
- [x] 3.7 Add redaction tests proving tokens do not appear in stdout, stderr, snapshots, config files, or generated skills

## 4. Agent discovery commands and schemas

- [x] 4.1 Add runtime validation/schema definitions for common outputs, error envelope, config, task, project, and metadata objects
- [x] 4.2 Implement `singularity version --json` without upstream API client initialization
- [x] 4.3 Implement `singularity commands --json` with command descriptions, args, examples, schema names, and error codes
- [x] 4.4 Implement `singularity schemas --json` from the same schema source used by validation
- [x] 4.5 Add deterministic JSON snapshot tests for version, commands, schemas, and representative error envelopes

## 5. Adapter expansion

- [x] 5.1 Extend upstream discovery and adapter map to cover P0 methods: task create/update/complete/delete/move and project create/update
- [x] 5.2 Replace unstructured P0 adapter params with typed request/response objects
- [x] 5.3 Add payload builders for task dates, timezone, notifications, priority, base task groups, and project emoji/showInBasket rules
- [x] 5.4 Normalize official response shapes into schema-backed command outputs with empty arrays instead of null
- [x] 5.5 Map missing official methods to `ADAPTER_UNAVAILABLE` and missing response fields to `UPSTREAM_SCHEMA_MISMATCH`
- [x] 5.6 Add adapter contract fixtures for list/get/create/update/complete/delete/move tasks and list/get/create/update projects
- [x] 5.7 Document any unavoidable direct REST fallback as technical debt and keep it behind adapter tests

## 6. Task command implementation

- [x] 6.1 Add `tasks list` with filters for project, status, date range, tag, limit, and search text when supported
- [x] 6.2 Add `tasks get --id <id>`
- [x] 6.3 Add `tasks create --title <title>` with project, task group, parent, date, deadline, priority, tags, description, checklist, assignee, and notification options
- [x] 6.4 Add default base task group and priority resolution from project config
- [x] 6.5 Add `tasks update --id <id>` with partial update validation and empty-payload failure
- [x] 6.6 Add `tasks complete --id <id>` returning updated task output
- [x] 6.7 Add `tasks delete --id <id>` with soft-delete preference and confirmation guard
- [x] 6.8 Add `tasks move --id <id> --project <projectIdOrAlias>`
- [x] 6.9 Add tests for task timezone/date-only serialization, notifications sorting, default priority, modifiedDate interpretation, and validation errors

## 7. Project command implementation

- [x] 7.1 Add `projects list` with active default and archived/deleted filters when supported
- [x] 7.2 Add `projects get --id <id>`
- [x] 7.3 Add `projects create --title <title>` with parent, description, emoji, notebook flag, and base task group metadata where supported
- [x] 7.4 Add `projects update --id <id>` with partial update validation and empty-payload failure
- [x] 7.5 Implement emoji normalization from emoji characters to lowercase hex and reject `U+`/invalid formats
- [x] 7.6 Ensure `showInBasket` is omitted unless explicitly requested
- [x] 7.7 Add command JSON snapshots and human-output tests for project commands

## 8. Claude skill generation

- [x] 8.1 Add `src/skills/` with versioned templates and renderer; do not build Markdown inside command handlers
- [x] 8.2 Implement `singularity skills --agent claude` defaulting to `.claude/skills/singularity-api/SKILL.md`
- [x] 8.3 Add optional slash command wrapper generation under `.claude/commands/singularity/`
- [x] 8.4 Add generated marker `singularity_generated: true` and safe overwrite/collision behavior
- [x] 8.5 Implement `skills --check --json` as a read-only freshness check
- [x] 8.6 Include required API rules for base task groups, emoji, showInBasket, Delta, timezone, notifications, priority, notebooks, habits, and colors
- [x] 8.7 Add snapshot tests for generated skill and command wrapper files

## 9. Upstream check and upgrade

- [x] 9.1 Implement `upstream check --json` to compare bundled MCPB version/SHA with configured source without file mutation
- [x] 9.2 Implement `upstream upgrade --to <version|url>` download, hash, structure validation, discovery, and lockfile/archive update
- [x] 9.3 Regenerate adapter map and golden fixtures during upgrade
- [x] 9.4 Ensure failed upgrade leaves existing archive and lockfile unchanged
- [x] 9.5 Add precise `UPSTREAM_BREAKING_CHANGE` reports for missing files/modules/functions
- [x] 9.6 Add npm script argument forwarding tests for `upstream:check`, `upstream:upgrade`, and `upstream:verify`

## 10. Regression and CI

- [x] 10.1 Add JSON snapshot tests for all P0 command outputs and common failures
- [x] 10.2 Add MCPB structure tests for required files, module exports, and adapter map coverage
- [x] 10.3 Add GitHub Actions PR workflow for install, build, typecheck, lint, unit tests, adapter tests, snapshots, OpenSpec validation, package dry-run, and upstream verify
- [x] 10.4 Add manual upstream upgrade workflow with `upstream_version` and `upstream_url` inputs
- [x] 10.5 Add optional live smoke tests gated by `SINGULARITY_REFRESH_TOKEN` and disposable project id
- [x] 10.6 Add coverage thresholds or coverage reporting targeting 90% for parsing, validation, errors, config, skills, and adapter contracts

## 11. P1 backlog contracts

- [x] 11.1 Add notes/notebook commands with Delta array validation and final-newline rule
- [x] 11.2 Add task note methods using the same Delta rules
- [x] 11.3 Add habit list/get/create/update/complete with active default and exact color validation
- [x] 11.4 Add tags and task group commands when official modules expose them
- [x] 11.5 Add search command when official modules expose search
- [x] 11.6 Add `completion bash|zsh|fish`, examples, and importable TypeScript SDK after P0 stabilizes

## 12. Validation

- [x] 12.1 Run `npm run build`
- [x] 12.2 Run `npm run typecheck`
- [x] 12.3 Run `npm run lint`
- [x] 12.4 Run `npm test`
- [x] 12.5 Run `npm run test:adapter`
- [x] 12.6 Run command/schema/skill snapshot tests
- [x] 12.7 Run `npm run pack:check`
- [x] 12.8 Run `openspec validate close-mvp-api-architecture-gaps --strict`
- [x] 12.9 Run `openspec validate --all --strict --no-interactive`
