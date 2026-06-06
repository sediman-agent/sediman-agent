/**
 * ShellTool - Shell command execution
 *
 * Based on kimi-code's BashTool with proper:
 * - BuiltinTool interface
 * - ToolResultBuilder for output formatting
 * - Timeout and signal handling
 * - Non-interactive environment setup
 * - Display metadata
 */

import { z } from 'zod';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { BuiltinTool, ExecutableToolResult, ToolExecution } from '../tooling/types';
import { literalRulePattern, matchesGlobRuleSubject } from '../tooling/types';
import { ToolAccesses } from '../tooling/tool-access';
import { ToolResultBuilder } from '../tooling/result-builder';
import { zodToJsonSchema as convertSchema } from '../tooling/schema-utils';

const execAsync = promisify(exec);

const DEFAULT_TIMEOUT_S = 60;
const MAX_TIMEOUT_S = 5 * 60;
const MS_PER_SECOND = 1000;

const ShellInputSchema = z.object({
  command: z.string().min(1, 'Command cannot be empty').describe('The shell command to execute'),
  cwd: z.string().optional().describe('Working directory for the command'),
  timeout: z.number().int().positive().default(DEFAULT_TIMEOUT_S)
    .describe(`Timeout in seconds (default: ${DEFAULT_TIMEOUT_S}, max: ${MAX_TIMEOUT_S})`),
  env: z.record(z.string()).optional().describe('Environment variables for the command')
}).describe('Shell command input');

type ShellInput = z.infer<typeof ShellInputSchema>;

export class ShellTool implements BuiltinTool<ShellInput> {
  readonly name = 'Shell' as const;
  readonly description = `Execute shell commands for computer control and automation.

This tool allows you to control the computer via command line:
- Run bash/shell commands
- Execute scripts and programs
- Manage files and directories
- Control system processes
- Interact with system utilities

Safety features:
- Commands run in controlled environment
- Timeout protection prevents hanging
- Output limits prevent memory issues
- Non-interactive mode prevents blocking

Usage examples:
- List files: command="ls -la"
- Search files: command="find . -name '*.pdf'"
- System info: command="uname -a"
- Process control: command="ps aux | head -20"

Default working directory is the current workspace.`;

  readonly parameters = convertSchema(ShellInputSchema);

  constructor(private readonly cwd: string = process.cwd()) {}

  resolveExecution(args: ShellInput): ToolExecution {
    const preview = args.command.length > 50
      ? `${args.command.slice(0, 50)}…`
      : args.command;

    return {
      accesses: ToolAccesses.all(), // Shell commands can access everything
      description: `Running: ${preview}`,
      display: {
        kind: 'command',
        command: args.command,
        cwd: args.cwd ?? this.cwd,
        language: 'bash'
      },
      approvalRule: literalRulePattern(this.name, args.command),
      matchesRule: (ruleArgs) => matchesGlobRuleSubject(ruleArgs, args.command),
      execute: (ctx) => this.execution(args, ctx)
    };
  }

  private async execution(
    args: ShellInput,
    ctx: { signal: AbortSignal }
  ): Promise<ExecutableToolResult> {
    if (ctx.signal.aborted) {
      return {
        isError: true,
        output: 'Aborted before command started'
      };
    }

    const builder = new ToolResultBuilder({ maxChars: 100_000 });
    const timeout = Math.min(args.timeout ?? DEFAULT_TIMEOUT_S, MAX_TIMEOUT_S);
    const timeoutMs = timeout * MS_PER_SECOND;
    const commandCwd = args.cwd ?? this.cwd;

    // Non-interactive environment
    const noninteractiveEnv: Record<string, string> = {
      NO_COLOR: '1',
      TERM: 'dumb',
      GIT_TERMINAL_PROMPT: '0',
      ...(args.env ?? {})
    };

    // Merge with process env
    const mergedEnv = {
      ...(process.env as Record<string, string>),
      ...noninteractiveEnv
    };

    builder.write(`Executing: ${args.command}\n`);
    if (commandCwd !== this.cwd) {
      builder.write(`Working directory: ${commandCwd}\n`);
    }

    try {
      // Race between exec and timeout/abort
      const execPromise = execAsync(args.command, {
        cwd: commandCwd,
        timeout: timeoutMs,
        env: mergedEnv,
        maxBuffer: 1024 * 1024 * 10 // 10MB limit
      });

      const abortPromise = new Promise<never>((_, reject) => {
        ctx.signal.addEventListener('abort', () => {
          reject(new Error('Aborted by signal'));
        });
      });

      const { stdout, stderr } = await Promise.race([execPromise, abortPromise]);

      // Stream output to builder
      if (stdout) {
        builder.write(stdout);
      }
      if (stderr) {
        builder.write(stderr);
      }

      if (!stdout && !stderr) {
        builder.write('Command executed with no output.');
      }

      return builder.ok('Command completed successfully');
    } catch (error: any) {
      const exitCode = error.code ?? 'unknown';
      const stderr = error.stderr ?? '';
      const message = error.message ?? String(error);

      builder.write(`\nExit code: ${exitCode}`);
      if (stderr) {
        builder.write(`\n${stderr}`);
      }

      builder.error(`Command failed: ${message}`);
      return builder.error('Shell command execution failed');
    }
  }
}
