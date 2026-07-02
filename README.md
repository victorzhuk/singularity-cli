# singularity-cli

Command-line client for the Singularity API. Manages projects, tasks, task
groups, tags, notes, habits, and skills, with machine-readable output for use in
scripts and agents.

## Install

```sh
npm install -g @zhuk/singularity-cli
```

Or run without installing:

```sh
npx @zhuk/singularity-cli --help
```

Requires Node.js >= 22. The binary is `singularity`.

## Usage

```sh
singularity init                 # scaffold config
singularity auth status          # check credentials
singularity config validate      # validate the active config
singularity commands --json      # list every command with metadata
singularity skills --agent claude
```

Run `singularity` with no arguments for help and recommended next commands.

### Commands

| Command      | Purpose                                          |
| ------------ | ------------------------------------------------ |
| `init`       | scaffold a new config                            |
| `config`     | inspect and validate configuration               |
| `auth`       | manage and check API credentials                 |
| `projects`   | manage projects                                  |
| `tasks`      | manage tasks                                     |
| `taskgroups` | manage task groups                               |
| `tags`       | manage tags                                      |
| `notes`      | manage notes and notebooks                       |
| `habits`     | manage habits                                    |
| `skills`     | list skills for an agent                         |
| `search`     | search across resources                          |
| `upstream`   | manage the bundled MCPB package                  |
| `completion` | generate shell completions                       |
| `commands`   | list all commands and their metadata             |
| `schemas`    | print JSON Schema for all output types           |
| `version`    | print CLI and upstream MCPB version information   |

### Global flags

- `--json` — emit JSON instead of human-readable output
- `--cwd <dir>` — working directory
- `--config <path>` — config file path
- `--profile <name>` — config profile
- `--project <id-or-alias>` — target project
- `--token <token>` — API token override
- `--api-url <url>` — API URL override
- `--timeout-ms <number>` — request timeout
- `--no-color` — disable colored output

## License

Apache-2.0
