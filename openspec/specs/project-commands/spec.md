# project-commands Specification

## Purpose
TBD - created by archiving change close-mvp-api-architecture-gaps. Update Purpose after archive.
## Requirements
### Requirement: Project read commands

The CLI SHALL provide `singularity projects list` and `singularity projects get --id <id>`. List SHALL return active projects by default and support archived/deleted filters when upstream supports them.

#### Scenario: List projects defaults to active

- **WHEN** `projects list --json` runs without archived/deleted flags
- **THEN** stdout contains active projects by default

#### Scenario: Get project returns details

- **WHEN** `projects get --id <id> --json` succeeds
- **THEN** stdout contains normalized project details for that id

### Requirement: Project create command

`singularity projects create --title <title>` SHALL support parent project, description, emoji, notebook flag, and base task group metadata when supported by the official code.

#### Scenario: Create project sends supported fields

- **WHEN** project create is run with title, parent, description, emoji, and notebook flag
- **THEN** the adapter receives the supported normalized project payload

#### Scenario: Create project records base task group metadata

- **WHEN** upstream returns or accepts base task group metadata
- **THEN** the command includes it in normalized output or config update suggestions

### Requirement: Project update command

`singularity projects update --id <id>` SHALL support title, description, archive state, emoji, and ordering fields when supported by the official code. Empty update payloads SHALL fail validation.

#### Scenario: Empty project update fails

- **WHEN** `projects update --id <id>` has no update fields
- **THEN** it fails with `VALIDATION_FAILED`

#### Scenario: Archive update uses explicit flag

- **WHEN** a project archive state is changed
- **THEN** the payload includes only the requested archive state and required id fields

### Requirement: Emoji serialization

Project emoji SHALL be sent as a lowercase hexadecimal Unicode string without prefix. Emoji characters MAY be converted to hex. `U+` formats and invalid hex SHALL be rejected.

#### Scenario: Emoji character converts to lowercase hex

- **WHEN** `projects create --emoji 🚀` is run
- **THEN** the payload contains `emoji: "1f680"`

#### Scenario: U-plus emoji format is rejected

- **WHEN** an emoji is supplied as `U+1F680`
- **THEN** the command fails with `VALIDATION_FAILED`

### Requirement: Basket visibility rule

The CLI SHALL NOT set `showInBasket` unless the user explicitly asks for basket visibility.

#### Scenario: Basket visibility omitted by default

- **WHEN** project create or update runs without an explicit basket flag
- **THEN** the payload does not contain `showInBasket`

#### Scenario: Explicit basket flag is honored

- **WHEN** the user supplies the supported basket visibility flag
- **THEN** the payload contains the requested `showInBasket` value

