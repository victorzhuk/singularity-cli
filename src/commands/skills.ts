import path from 'node:path';
import { Command } from 'commander';
import { loadResolvedConfig } from '../config/index.js';
import { contextFromCommand } from '../core/context.js';
import { NotImplementedError } from '../core/errors.js';
import { output, outputSummary, warnStderr } from '../formatters/index.js';
import type { CommandMeta } from '../schemas/index.js';
import { checkSkillFiles, renderCommandWrapper, renderSkill, writeGenerated } from '../skills/index.js';

const COMMAND_WRAPPERS: Array<[string, string]> = [
  ['tasks-create', 'Create a Singularity task'],
  ['tasks-list', 'List Singularity tasks'],
  ['tasks-update', 'Update a Singularity task'],
  ['tasks-delete', 'Delete a Singularity task'],
  ['projects-create', 'Create a Singularity project'],
  ['projects-list', 'List Singularity projects'],
  ['projects-update', 'Update a Singularity project'],
];

export const skillsMetadata: CommandMeta[] = [
  {
    name: 'skills',
    description: 'generate agent skill files for the Singularity API',
    args: [],
    examples: [
      'singularity skills --agent claude --json',
      'singularity skills --agent claude --output-dir .claude --json',
      'singularity skills --agent claude --check --json',
      'singularity skills --agent claude --with-commands --json',
    ],
    outputSchema: null,
    errorCodes: ['NOT_IMPLEMENTED', 'GENERATED_FILE_COLLISION', 'VALIDATION_FAILED'],
  },
];

export function createSkillsCommand(): Command {
  const cmd = new Command('skills')
    .description('generate agent skill files for the Singularity API')
    .option('--agent <name>', 'target agent (supported: claude)', 'claude')
    .option('--force', 'overwrite non-generated files')
    .option('--check', 'check skill files without writing (exits non-zero if missing or stale)')
    .option('--with-commands', 'also generate slash-command wrapper files')
    .option('--output-dir <dir>', 'output directory (default: .claude under cwd)')
    .option('--json', 'output JSON')
    .action(async () => {
      const ctx = contextFromCommand(cmd);
      const opts = cmd.opts() as {
        agent: string;
        force?: boolean;
        check?: boolean;
        withCommands?: boolean;
        outputDir?: string;
        json?: boolean;
      };

      if (opts.agent !== 'claude') {
        throw new NotImplementedError(`skills --agent ${opts.agent}; supported: claude`);
      }

      const cfg = loadResolvedConfig(ctx);
      const outDir =
        opts.outputDir ??
        cfg.repo?.skills?.claude?.outputDir ??
        cfg.global?.skills?.claude?.outputDir ??
        path.join(ctx.cwd, '.claude');

      const skillPath = path.join(outDir, 'skills', 'singularity-api', 'SKILL.md');
      const rendered = await renderSkill();

      if (opts.check) {
        const result = checkSkillFiles(skillPath, rendered.content);
        output(ctx, result, () => {
          if (result.ok) {
            outputSummary(ctx, 'skill files up to date');
          } else {
            if (result.missing.length) warnStderr(`missing: ${result.missing.join(', ')}`);
            if (result.stale.length) warnStderr(`stale: ${result.stale.join(', ')}`);
          }
        });
        if (!result.ok) process.exit(1);
        return;
      }

      const force = opts.force ?? false;
      const written: string[] = [];

      writeGenerated(skillPath, rendered.content, force);
      written.push(skillPath);

      if (opts.withCommands) {
        for (const [name, summary] of COMMAND_WRAPPERS) {
          const wrapperPath = path.join(outDir, 'commands', 'singularity', `${name}.md`);
          writeGenerated(wrapperPath, renderCommandWrapper(name, summary), force);
          written.push(wrapperPath);
        }
      }

      output(ctx, { generated: true, files: written }, () => {
        outputSummary(ctx, `generated ${written.length} file(s)`);
        for (const f of written) outputSummary(ctx, `  ${f}`);
      });
    });

  return cmd;
}
