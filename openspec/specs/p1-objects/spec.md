# p1-objects Specification

## Purpose
TBD - created by archiving change close-mvp-api-architecture-gaps. Update Purpose after archive.
## Requirements
### Requirement: Notes and notebooks

The CLI SHALL support notes and notebooks as P1 operations using official MCPB modules when exposed. Notebook creation SHALL create a project with the notebook attribute when supported. Note content SHALL use Delta operations arrays directly and SHALL end with a newline.

#### Scenario: Notebook creates project with notebook attribute

- **WHEN** the user creates a notebook and upstream supports notebook projects
- **THEN** the adapter creates a project with the notebook attribute

#### Scenario: Delta payload rejects ops wrapper

- **WHEN** note content is supplied as `{ "ops": [...] }`
- **THEN** validation fails with `DELTA_INVALID`

#### Scenario: Delta payload requires final newline

- **WHEN** the final Delta insert lacks a line break
- **THEN** validation fails with `DELTA_INVALID`

### Requirement: Note-like project entries

When adding items to a notebook, the CLI SHALL create tasks with `isNote` by default. If the user explicitly asks for a task, it SHALL create a normal task. Notes in normal projects SHALL also create tasks with `isNote`.

#### Scenario: Notebook item defaults to note

- **WHEN** an item is added to a notebook without explicit task mode
- **THEN** the payload sets `isNote`

#### Scenario: Explicit task in notebook is normal task

- **WHEN** the user explicitly creates a task in a notebook
- **THEN** the payload does not set note mode unless requested

### Requirement: Habit operations

The CLI SHALL support habit list/get/create/update/complete if official modules expose them. New habits SHALL default to active `status: 0`. Habit color SHALL be one of the exact allowed color names.

#### Scenario: Habit color validation rejects codes

- **WHEN** habit create/update receives a color code or unknown color
- **THEN** validation fails with `VALIDATION_FAILED` and details include the allowed color list

#### Scenario: New habit defaults active

- **WHEN** a habit is created without explicit status
- **THEN** the payload sets `status: 0`

### Requirement: Additional object commands

The CLI SHALL add P1 commands for tags, sections/task groups, and search when official modules expose those operations.

#### Scenario: Unsupported object command is explicit

- **WHEN** an additional object command is requested but the official module is not callable
- **THEN** the command fails with `ADAPTER_UNAVAILABLE`

### Requirement: Developer experience extensions

The CLI SHALL add shell completion, examples for agent tools, and an importable TypeScript SDK after P0 contracts are stable.

#### Scenario: Completion command emits shell script

- **WHEN** `singularity completion bash`, `zsh`, or `fish` is run
- **THEN** stdout contains the completion script for that shell

#### Scenario: SDK reuses validation contracts

- **WHEN** the TypeScript SDK is used programmatically
- **THEN** it uses the same config, validation, adapter, schemas, and error contracts as the CLI

