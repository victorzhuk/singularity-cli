## ADDED Requirements

### Requirement: Skills command

The CLI SHALL provide `singularity skills` with options `--agent claude`, `--force`, `--check`, `--output-dir`, and `--json`. MVP SHALL support Claude Code.

#### Scenario: Claude is the supported MVP target

- **WHEN** `skills --agent claude` runs
- **THEN** it targets Claude Code skill files

#### Scenario: Unsupported agent is explicit

- **WHEN** `skills --agent cursor` is requested before support exists
- **THEN** the command fails with `NOT_IMPLEMENTED` or `VALIDATION_FAILED` naming supported agents

### Requirement: Generated file locations

By default, Claude skills SHALL be generated under `.claude/skills/singularity-api/SKILL.md` and optional slash command wrappers under `.claude/commands/singularity/`. Config and `--output-dir` SHALL override the skill output directory.

#### Scenario: Default Claude skill path is used

- **WHEN** no skill output override is configured
- **THEN** generation writes `.claude/skills/singularity-api/SKILL.md`

#### Scenario: Configured output path is used

- **WHEN** `.singularity-project.yml` configures `skills.claude.outputDir`
- **THEN** generation writes under that directory unless `--output-dir` overrides it

### Requirement: Generated marker and overwrite safety

Generated files SHALL include `singularity_generated: true`. Regeneration SHALL overwrite only marked files unless `--force` is supplied.

#### Scenario: Marked generated file can be overwritten

- **WHEN** a generated file contains the marker
- **THEN** regeneration may update it

#### Scenario: Unmarked file is protected

- **WHEN** a target file exists without the generated marker and `--force` is not supplied
- **THEN** generation fails with `GENERATED_FILE_COLLISION`

### Requirement: Check mode

`singularity skills --check --json` SHALL verify generated files are present and current without writing changes.

#### Scenario: Check mode is read-only

- **WHEN** `skills --check` runs
- **THEN** no files are created, modified, or deleted

#### Scenario: Stale generated file is reported

- **WHEN** a generated file is missing or differs from the current template output
- **THEN** check mode fails with details naming the stale or missing files

### Requirement: Template-driven skill content

Skill generation SHALL use versioned templates and snapshot tests. Command handlers SHALL NOT assemble arbitrary Markdown strings inline.

#### Scenario: Skill content includes API rules

- **WHEN** the Claude skill is generated
- **THEN** it includes rules for base task groups, emoji hex serialization, `showInBasket`, Delta note content, task timezone handling, notifications, priority defaults, note/notebook mapping, habit status, and habit colors

#### Scenario: Skill snapshot is stable

- **WHEN** skill snapshot tests run without template changes
- **THEN** generated skill output matches the stored snapshot
