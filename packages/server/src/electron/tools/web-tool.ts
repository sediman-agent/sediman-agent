/**
 * WebTool - Web operations (fetch, search)
 *
 * Based on kimi-code's tool pattern with proper:
 * - BuiltinTool interface
 * - resolveExecution returning execution plan
 * - ToolResultBuilder for output formatting
 * - Display metadata for UI
 * - ToolAccesses for resource tracking
 */

import { z } from 'zod';
import type { BuiltinTool, ExecutableToolResult, ToolExecution } from '../tooling/types';
import { literalRulePattern, matchesGlobRuleSubject } from '../tooling/types';
import { ToolAccesses } from '../tooling/tool-access';
import { ToolResultBuilder } from '../tooling/result-builder';
import { zodToJsonSchema as convertSchema, createOneOfSchema } from '../tooling/schema-utils';

const WebFetchInputSchema = z.object({
  action: z.literal('fetch'),
  url: z.string().url('Invalid URL format'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
  headers: z.record(z.string()).optional().default({}),
  body: z.string().optional(),
});

const WebSearchInputSchema = z.object({
  action: z.literal('search'),
  query: z.string().min(1, 'Query cannot be empty'),
  max_results: z.number().int().positive().default(5),
});

const WebInputSchema = z.union([
  WebFetchInputSchema,
  WebSearchInputSchema,
]);

type WebInput = z.infer<typeof WebInputSchema>;
type WebFetchInput = z.infer<typeof WebFetchInputSchema>;
type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

export class WebTool implements BuiltinTool<WebInput> {
  readonly name = 'Web' as const;
  readonly description = `Web operations for fetching URLs and searching the web.

This tool provides web capabilities:
- fetch: Fetch content from a URL with customizable method, headers, and body
- search: Search the web for information (uses web search API)

All web operations include proper error handling and timeout protection.

Usage examples:
- Fetch a webpage: { action: "fetch", url: "https://example.com" }
- Search web: { action: "search", query: "weather in Tokyo" }`;

  readonly parameters = createOneOfSchema([
    {
      description: 'Fetch a URL',
      properties: {
        action: { const: 'fetch', type: 'string' },
        url: { type: 'string', description: 'URL to fetch' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' },
        headers: { type: 'object', additionalProperties: { type: 'string' } },
        body: { type: 'string' },
      },
      required: ['action', 'url'],
    },
    {
      description: 'Search the web',
      properties: {
        action: { const: 'search', type: 'string' },
        query: { type: 'string', description: 'Search query' },
        max_results: { type: 'number', default: 5 },
      },
      required: ['action', 'query'],
    },
  ]);

  resolveExecution(args: WebInput): ToolExecution {
    const action = args.action;
    const target = action === 'fetch'
      ? (args as WebFetchInput).url
      : (args as WebSearchInput).query;

    const preview = target.length > 50 ? target.slice(0, 50) + '...' : target;

    return {
      accesses: ToolAccesses.none(), // Web operations don't access local files
      description: `Web operation: ${action} - ${preview}`,
      display: {
        kind: 'web',
        action,
        target,
      },
      approvalRule: literalRulePattern(this.name, action),
      matchesRule: (ruleArgs) => matchesGlobRuleSubject(ruleArgs, action),
      execute: (ctx) => this.execution(args, ctx)
    };
  }

  private async execution(
    args: WebInput,
    ctx: { signal: AbortSignal }
  ): Promise<ExecutableToolResult> {
    if (ctx.signal.aborted) {
      return { isError: true, output: 'Aborted before web operation started' };
    }

    const builder = new ToolResultBuilder({ maxChars: 100_000 });

    try {
      switch (args.action) {
        case 'fetch': {
          return await this.handleFetch(args as WebFetchInput, builder, ctx.signal);
        }

        case 'search': {
          return await this.handleSearch(args as WebSearchInput, builder);
        }

        default: {
          return builder.error(`Unknown action: ${(args as any).action}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      builder.write(`\nError: ${errorMessage}`);
      return builder.error('Web operation failed');
    }
  }

  private async handleFetch(
    args: WebFetchInput,
    builder: ToolResultBuilder,
    signal: AbortSignal
  ): Promise<ExecutableToolResult> {
    builder.write(`Fetching: ${args.url}\n`);
    builder.write(`Method: ${args.method}\n`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    // Link external abort signal
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(args.url, {
        method: args.method,
        headers: args.headers,
        body: args.body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const text = await response.text();

      builder.write(`Status: ${response.status} ${response.statusText}\n`);
      builder.write(`Content-Length: ${text.length} bytes\n`);
      builder.write('\n--- Response Body ---\n');
      builder.write(text.slice(0, 100_000)); // Limit to 100KB

      if (text.length > 100_000) {
        builder.write('\n[...truncated...]');
      }

      if (response.ok) {
        return builder.ok(`Fetched successfully (${response.status})`);
      } else {
        return builder.error(`HTTP error: ${response.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async handleSearch(
    args: z.infer<typeof WebSearchInputSchema>,
    builder: ToolResultBuilder
  ): Promise<ExecutableToolResult> {
    builder.write(`Searching for: ${args.query}\n`);
    builder.write(`Max results: ${args.max_results}\n`);

    // TODO: Integrate with actual search API (e.g., Bing, Google, DuckDuckGo)
    // For now, return a placeholder
    builder.write('\n--- Search Results ---\n');
    builder.write('[Web search is not yet configured. Please configure a search API.]\n');
    builder.write(`\nQuery: ${args.query}`);
    builder.write(`Expected ${args.max_results} results`);

    return builder.error('Web search not configured');
  }
}
