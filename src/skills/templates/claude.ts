export const SKILL_TEMPLATE_VERSION = 1;

interface SkillParams {
  cliVersion: string;
  mcpbVersion: string;
  templateVersion: number;
}

export function renderSkillMarkdown({ cliVersion, mcpbVersion, templateVersion }: SkillParams): string {
  return `---
singularity_generated: true
name: singularity-api
description: Rules for Singularity task and project management via singularity-cli
cli_version: ${cliVersion}
mcpb_version: ${mcpbVersion}
template_version: ${templateVersion}
---

# Singularity API rules

Use \`singularity\` CLI for all task and project operations. Follow these rules exactly.

## Base task groups

Every task creation requires a \`baseTaskGroupId\`. Resolve it from:
1. Project config \`baseTaskGroupId\` field
2. Profile \`defaultBaseTaskGroupId\`

If neither is available, surface \`BASE_TASK_GROUP_MISSING\` — do not proceed without it.

## Emoji serialization

Pass emoji as a lowercase hex codepoint using \`codePointAt(0).toString(16).toLowerCase()\`
(e.g. \`🚀\` → \`1f680\`). Never use \`U+\` notation or \`charCodeAt\`. Invalid input raises
\`VALIDATION_FAILED\`.

## showInBasket

Omit \`showInBasket\` from project payloads unless the user explicitly requests it.
An omitted field is distinct from \`false\` — do not default it.

## Delta note content

Note content is a bare ops array (Quill Delta format):

\`\`\`json
[{"insert": "line one\\n"}, {"insert": "line two\\n"}]
\`\`\`

Never wrap in \`{ "ops": [...] }\`. The final insert MUST end with \`\\n\`;
a missing trailing newline raises \`DELTA_INVALID\`.

## Task timezone and useTime

- Date-only strings (e.g. \`2024-06-30\`) → set \`useTime: false\`
- Date-time strings → set \`useTime: true\`, interpreted in the profile timezone (GMT offset)
- Always pass the correct GMT offset when scheduling timed tasks

## Notifications

- \`--notify-minutes 15,60\` → \`notifyMinutes: [60, 15]\` (descending order)
- Setting \`notifyMinutes\` also sets \`notify: 1\`
- \`alarmNotify\` is opt-in — set it only when the user explicitly passes \`--alarm-notify\`

## Priority

Default task priority is \`1\` when no priority is specified.
Pass \`--priority\` to override.

## Notes and notebooks

Set \`isNote: true\` when creating a note item.
Use \`--notebook\` when creating a notebook project.
Notes live inside projects; the \`isNote\` flag distinguishes them from regular tasks.

## Habit status

New habits default to \`status: 0\` (active). Do not set a non-zero status on creation
unless the user explicitly requests a different value.

## Habit colors

Habit color must be one of the 10 named values: red, orange, yellow, green, teal, blue, purple, pink, brown, gray.
Pass the name exactly as listed (e.g. \`blue\`, \`red\`). Any other value raises \`VALIDATION_FAILED\`.
Omit the field entirely when not specified.
`;
}

export function renderCommandWrapper(name: string, summary: string): string {
  return `---
singularity_generated: true
description: ${summary}
---

Use \`singularity ${name.replace(/-/g, ' ')}\` to ${summary.toLowerCase()}.

Consult \`.claude/skills/singularity-api/SKILL.md\` for required payload rules (baseTaskGroup,
emoji hex, Delta format, useTime, notify order, priority default, isNote, habit color).
`;
}
