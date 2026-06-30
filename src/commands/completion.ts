import { Command } from 'commander';
import { contextFromCommand } from '../core/context.js';
import { ValidationFailedError } from '../core/errors.js';
import { output, outputSummary } from '../formatters/index.js';
import type { CommandMeta } from '../schemas/index.js';

const SUPPORTED_SHELLS = ['bash', 'zsh', 'fish'] as const;
type SupportedShell = typeof SUPPORTED_SHELLS[number];

const EXAMPLES = [
  'singularity tasks list --project myproject --json',
  'singularity tasks create --title "Review PR" --project myproject --json',
  'singularity projects list --json',
  'singularity commands --json',
  'singularity schemas --json',
  'singularity auth status --json',
  'singularity tags list --json',
  'singularity task-groups list --project <id> --json',
  'singularity search --query "my task" --json',
];

export function generateCompletionScript(shell: string, topLevelNames: string[]): string {
  if (!(SUPPORTED_SHELLS as readonly string[]).includes(shell)) {
    throw new ValidationFailedError(
      `unsupported shell: ${shell}; supported: ${SUPPORTED_SHELLS.join(', ')}`,
      { field: 'shell', supported: [...SUPPORTED_SHELLS] },
    );
  }

  const sh = shell as SupportedShell;
  const names = topLevelNames.join(' ');

  if (sh === 'bash') {
    return [
      '# singularity bash completion',
      '_singularity_completions() {',
      `  local cmds="${names}"`,
      '  COMPREPLY=($(compgen -W "$cmds" -- "${COMP_WORDS[COMP_CWORD]}"))',
      '}',
      'complete -F _singularity_completions singularity',
      '',
    ].join('\n');
  }

  if (sh === 'zsh') {
    const listed = topLevelNames.map((n) => `    '${n}'`).join('\n');
    return [
      '#compdef singularity',
      '_singularity() {',
      '  local -a cmds',
      '  cmds=(',
      listed,
      '  )',
      "  _describe 'command' cmds",
      '}',
      '_singularity "$@"',
      '',
    ].join('\n');
  }

  // fish
  return (
    topLevelNames.map((n) => `complete -c singularity -f -a '${n}'`).join('\n') + '\n'
  );
}

export const completionMetadata: CommandMeta[] = [
  {
    name: 'completion',
    description: 'generate shell completion scripts',
    args: [
      {
        name: 'shell',
        required: true,
        description: 'shell type: bash, zsh, or fish',
      },
    ],
    examples: [
      'singularity completion bash >> ~/.bash_completion',
      'singularity completion zsh > ~/.zfunc/_singularity',
      'singularity completion fish > ~/.config/fish/completions/singularity.fish',
    ],
    outputSchema: null,
    errorCodes: ['VALIDATION_FAILED'],
  },
  {
    name: 'completion examples',
    description: 'print agent-oriented example invocations',
    args: [],
    examples: ['singularity completion examples --json'],
    outputSchema: null,
    errorCodes: [],
  },
];

export function createCompletionCommand(): Command {
  const completionCmd = new Command('completion')
    .description('generate shell completion scripts')
    .argument('<shell>', 'shell type: bash, zsh, or fish')
    .option('--json', 'output JSON')
    .action((shell: string) => {
      const program = completionCmd.parent;
      const topLevelNames = program
        ? program.commands
            .map((c) => c.name())
            .filter(Boolean)
            .sort()
        : ['singularity'];
      const script = generateCompletionScript(shell, topLevelNames);
      process.stdout.write(script);
    });

  const examplesCmd = new Command('examples')
    .description('print agent-oriented example invocations')
    .option('--json', 'output JSON')
    .action(() => {
      const ctx = contextFromCommand(examplesCmd);
      output(ctx, { examples: EXAMPLES }, () => {
        for (const ex of EXAMPLES) {
          outputSummary(ctx, ex);
        }
      });
    });

  completionCmd.addCommand(examplesCmd);

  return completionCmd;
}
