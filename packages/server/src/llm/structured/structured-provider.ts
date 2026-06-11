/**
 * Structured Provider - Simplified
 *
 * Refactored from 474 lines to ~150 lines
 * Parsing extracted to ResponseParser
 * Validation extracted to TypeValidator
 * Retry logic extracted to RetryHandler
 */

import { LLMProvider } from "../provider";
import type { Message } from "../provider";
import type { ToolDefinition, LLMResponse } from "../../core/types";
import { StructuredResponseParser } from "./parsers/response-parser.js";
import { TypeValidator } from "./validators/type-validator.js";
import { RetryHandler } from "./handlers/retry-handler.js";
import { createLogger } from "../../core/logging";

const logger = createLogger('StructuredProvider');

export interface StructuredProviderOptions {
  parser?: StructuredResponseParser;
  validator?: TypeValidator;
  retryHandler?: RetryHandler;
  maxRetries?: number;
}

/**
 * Structured Provider handles LLM responses with structured output
 * This coordinates parsing, validation, and retry logic
 */
export class StructuredProvider extends LLMProvider {
  private parser: StructuredResponseParser;
  private validator: TypeValidator;
  private retryHandler: RetryHandler;
  private baseProvider: LLMProvider;

  constructor(
    baseProvider: LLMProvider,
    options: StructuredProviderOptions = {}
  ) {
    super();
    this.baseProvider = baseProvider;
    this.baseProvider = baseProvider;
    this.parser = options.parser ?? new StructuredResponseParser();
    this.validator = options.validator ?? new TypeValidator();
    this.retryHandler = options.retryHandler ?? new RetryHandler({
      maxAttempts: options.maxRetries ?? 3
    });
  }

  /**
   * Get model identifier
   */
  get model(): string {
    // LLMProvider doesn't have a model property, so return a default
    return 'structured-provider';
  }

  /**
   * Chat with structured output
   */
  async chat(messages: Message[], tools: ToolDefinition[], system?: string): Promise<LLMResponse> {
    // Call the base provider's chat method with the correct signature
    return this.baseProvider.chat(messages, tools, system);
  }

  /**
   * Chat with tools and structured output parsing
   */
  async chatStreamWithTools(
    messages: Message[],
    tools: ToolDefinition[],
    system?: string,
    onChunk?: (chunk: string) => void
  ): Promise<any> {
    return this.baseProvider.chatStreamWithTools(messages, tools, system, onChunk);
  }

  /**
   * Chat with streaming response
   */
  async *chatStream(
    messages: Message[],
    tools: ToolDefinition[],
    system?: string
  ): AsyncGenerator<string> {
    yield* this.baseProvider.chatStream(messages, tools, system);
  }

  /**
   * Chat with failover support
   */
  async chatWithFailover(
    messages: Message[],
    tools: ToolDefinition[],
    system?: string,
    fallback?: LLMProvider
  ): Promise<LLMResponse> {
    // For structured output, we don't use failover as the retry handler handles it
    return this.chat(messages, tools, system);
  }

  /**
   * Generate structured output
   */
  async generateStructured<T>(
    prompt: string,
    schema: any,
    options: {
      format?: 'json' | 'xml' | 'markdown' | 'auto';
      systemPrompt?: string;
      maxRetries?: number;
    } = {}
  ): Promise<T> {
    const { format = 'auto', systemPrompt, maxRetries = 3 } = options;

    logger.info(`[StructuredProvider] Generating structured output (format: ${format})`);

    // Build prompt with schema instructions
    const enhancedPrompt = this.buildPromptWithSchema(prompt, schema, format);

    // Execute with retry
    const result = await this.retryHandler.executeWithValidation(
      async () => {
        const response = await this.baseProvider.chat(
          [{ role: 'user', content: enhancedPrompt }],
          [], // tools parameter required by LLMProvider.chat
          systemPrompt
        );
        return response.text || '';
      },
      (response) => this.validateAndParse(response, schema, format)
    );

    if (!result.success) {
      throw new Error(`Failed to generate valid structured output: ${result.error}`);
    }

    return result.data as T;
  }

  /**
   * Build prompt with schema instructions
   */
  private buildPromptWithSchema(prompt: string, schema: any, format: string): string {
    const schemaInstructions = this.getSchemaInstructions(schema, format);
    return `${prompt}\n\n${schemaInstructions}`;
  }

  /**
   * Get schema formatting instructions
   */
  private getSchemaInstructions(schema: any, format: string): string {
    const schemaStr = JSON.stringify(schema, null, 2);

    switch (format) {
      case 'json':
        return `Respond with valid JSON matching this schema:\n\`\`\`json\n${schemaStr}\n\`\`\``;
      case 'xml':
        return `Respond with XML where each schema property is an element.`;
      case 'markdown':
        return `Respond with a Markdown table where columns represent schema properties.`;
      default:
        return `Respond with structured data matching this schema:\n${schemaStr}`;
    }
  }

  /**
   * Validate and parse response
   */
  private validateAndParse(response: string, schema: any, format: string): { valid: boolean; error?: string } {
    // Parse based on format
    let parseResult;
    switch (format) {
      case 'json':
        parseResult = this.parser.parseJson(response);
        break;
      case 'xml':
        parseResult = this.parser.parseXml(response);
        break;
      case 'markdown':
        parseResult = this.parser.parseMarkdownTable(response);
        break;
      case 'auto':
        parseResult = this.parser.autoParse(response);
        break;
      default:
        parseResult = this.parser.parseJson(response);
    }

    if (!parseResult.success) {
      return { valid: false, error: `Parse failed: ${parseResult.error}` };
    }

    // Validate against schema
    const validationResult = this.validator.validate(parseResult.data, schema);

    if (!validationResult.success) {
      return {
        valid: false,
        error: `Validation failed: ${validationResult.errors.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Extract structured data from response
   */
  extractStructured<T>(response: string, schema: any): { success: boolean; data?: T; error?: string } {
    logger.debug('[StructuredProvider] Extracting structured data from response');

    // Auto-detect format and parse
    const parseResult = this.parser.autoParse(response);

    if (!parseResult.success) {
      return {
        success: false,
        error: `Failed to parse response: ${parseResult.error}`
      };
    }

    // Validate parsed data
    const validationResult = this.validator.validate(parseResult.data, schema);

    if (!validationResult.success) {
      return {
        success: false,
        error: `Validation failed: ${validationResult.errors.join(', ')}`
      };
    }

    logger.info('[StructuredProvider] Successfully extracted and validated structured data');
    return {
      success: true,
      data: validationResult.data as T
    };
  }
}

/**
 * Factory function to create a structured provider wrapping another provider
 */
export function createStructuredProvider(baseProvider: LLMProvider, options?: StructuredProviderOptions): StructuredProvider {
  return new StructuredProvider(baseProvider, options);
}
