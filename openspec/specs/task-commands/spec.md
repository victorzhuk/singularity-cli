# task-commands Specification

## Purpose
TBD - created by archiving change close-mvp-api-architecture-gaps. Update Purpose after archive.
## Requirements
### Requirement: Task read commands

The CLI SHALL provide `singularity tasks list` and `singularity tasks get --id <id>`. List SHALL support filters for project, status, date range, tag, limit, and search text when supported by the official code.

#### Scenario: List tasks returns normalized array

- **WHEN** `tasks list --json` succeeds
- **THEN** stdout contains a deterministic object with `items` as an array and pagination metadata when upstream supports pagination

#### Scenario: Get task returns details

- **WHEN** `tasks get --id <id> --json` succeeds
- **THEN** stdout contains the normalized task details for that id

### Requirement: Task create command

`singularity tasks create --title <title>` SHALL support project, section/task group, parent, date, deadline, priority, tags, description, checklist items, assignee fields, notifications, and note fields when supported by the official code.

#### Scenario: Create task applies project defaults

- **WHEN** a task is created for a configured project without explicit task group or priority
- **THEN** the payload uses the project's `baseTaskGroupId` and configured default priority, falling back to priority `1`

#### Scenario: Missing base task group is explicit

- **WHEN** a task create operation requires a task group and none can be resolved safely
- **THEN** it fails with `BASE_TASK_GROUP_MISSING`

### Requirement: Task update command

`singularity tasks update --id <id>` SHALL support partial updates only. Empty update payloads SHALL fail validation before any upstream call.

#### Scenario: Empty update fails

- **WHEN** `tasks update --id <id>` contains no updatable fields
- **THEN** it fails with `VALIDATION_FAILED`

#### Scenario: Partial update sends only provided fields

- **WHEN** a task update changes title and priority only
- **THEN** the adapter receives a payload containing id, title, and priority without unrelated fields

### Requirement: Task lifecycle commands

The CLI SHALL provide `tasks complete --id <id>`, `tasks delete --id <id>`, and `tasks move --id <id> --project <projectIdOrAlias>` when supported by the official code.

#### Scenario: Complete task returns updated task

- **WHEN** `tasks complete --id <id> --json` succeeds
- **THEN** stdout contains the updated task

#### Scenario: Delete prefers soft-delete

- **WHEN** `tasks delete` is executed and upstream supports soft-delete or trash semantics
- **THEN** the command uses the safer soft-delete behavior

#### Scenario: Move task resolves project alias

- **WHEN** `tasks move --id <id> --project main` is executed
- **THEN** `main` is resolved through config before the adapter mutation call

### Requirement: Task date and timezone rules

User-specified task times SHALL be interpreted in the configured profile timezone represented as GMT offset. Date-only tasks SHALL use `useTime: false`; tasks with a specific time SHALL use `useTime: true`.

#### Scenario: Date-only task omits time

- **WHEN** a task is created with a date and no time
- **THEN** the serialized payload sets `useTime: false`

#### Scenario: Timed task uses profile timezone

- **WHEN** a task is created with a date and time
- **THEN** the serialized payload interprets the time in the resolved profile timezone and sets `useTime: true`

### Requirement: Task notification rules

Task notification flags SHALL support `--notify-minutes`, `--notify`, and `--alarm-notify`. Notifications SHALL serialize as descending minute arrays, set `notify: 1` when enabled, and set `alarmNotify: true` only when explicitly requested.

#### Scenario: Notify minutes are sorted descending

- **WHEN** `--notify-minutes 15,60` is supplied
- **THEN** the payload contains notification minutes `[60, 15]`

#### Scenario: Alarm notify is explicit

- **WHEN** notifications are enabled without `--alarm-notify`
- **THEN** `alarmNotify` is not set to true

### Requirement: Reschedule interpretation

The CLI SHALL NOT treat `modifiedDate` as completion time. A large difference between task date, `modifiedDate`, and `createdDate` SHALL be treated as rescheduling or technical modification unless official status fields indicate completion.

#### Scenario: Modified date is not completion

- **WHEN** task output has `modifiedDate` later than `createdDate`
- **THEN** the normalized output does not infer completion from `modifiedDate` alone

