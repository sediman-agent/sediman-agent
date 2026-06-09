/**
 * Enhanced parser for extracting thinking content from <think/> tags
 * Supports attributes like type, label, and streaming updates
 */

export interface ThinkBlock {
  content: string;
  type?: string;
  label?: string;
  confidence?: number;
}

export interface ParsedContent {
  thinking: ThinkBlock[];
  visible: string;
  hasThinking: boolean;
}

// Legacy format for backward compatibility
export interface LegacyParsedContent {
  thinking: string | null;
  visible: string;
}

export interface StreamingThinkUpdate {
  content: string;
  isComplete: boolean;
  type?: string;
}

const THINK_TAG_REGEX = /<(?:think|thinking)(?:\s([^>]*?))?\s*([\s\S]*?)<\/(?:think|thinking)>/gi;
const THINK_ATTRS_REGEX = /(\w+)=["']([^"']*)["']/g;

/**
 * Parse attributes from think tag opening
 */
function parseAttributes(attrString: string | undefined): Record<string, string> {
  if (!attrString) return {};
  const attrs: Record<string, string> = {};
  let match;
  while ((match = THINK_ATTRS_REGEX.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

/**
 * Parse text to extract thinking blocks and visible content
 */
export function parseThinkTags(text: string): ParsedContent {
  const thinkBlocks: ThinkBlock[] = [];
  let visible = text;
  let match;

  // Reset regex for new parsing
  THINK_TAG_REGEX.lastIndex = 0;

  while ((match = THINK_TAG_REGEX.exec(text)) !== null) {
    const attrs = parseAttributes(match[1]);
    const content = match[2].trim();

    thinkBlocks.push({
      content,
      type: attrs.type || attrs.label || undefined,
      label: attrs.label || attrs.type || undefined,
      confidence: attrs.confidence ? parseFloat(attrs.confidence) : undefined,
    });

    // Remove the think tag from visible content
    visible = visible.replace(match[0], '');
  }

  // Clean up extra whitespace
  visible = visible.replace(/\s+/g, ' ').trim();

  return {
    thinking: thinkBlocks.length > 0 ? thinkBlocks : [],
    visible,
    hasThinking: thinkBlocks.length > 0,
  };
}

/**
 * Strip all think tags from text
 */
export function stripThinkTags(text: string): string {
  return text.replace(THINK_TAG_REGEX, '').replace(/\s+/g, ' ').trim();
}

/**
 * Check if text contains think tags
 */
export function hasThinkTags(text: string): boolean {
  THINK_TAG_REGEX.lastIndex = 0;
  return THINK_TAG_REGEX.test(text);
}

/**
 * Extract streaming thinking update from partial content
 * Handles incomplete think tags during streaming
 */
export function parseStreamingThink(content: string): StreamingThinkUpdate {
  // Check for opening tag
  const openMatch = content.match(/<(?:think|thinking)(?:\s([^>]*?))?>/);
  if (!openMatch) {
    return { content: stripThinkTags(content), isComplete: true };
  }

  const attrs = parseAttributes(openMatch[1]);
  const closeMatch = content.match(/<\/(?:think|thinking)>/);

  if (!closeMatch) {
    // Incomplete - still streaming thinking
    return {
      content: '',
      isComplete: false,
      type: attrs.type || attrs.label,
    };
  }

  // Complete think tag
  const thinkContent = content.slice(openMatch[0].length, -closeMatch[0].length).trim();

  return {
    content: thinkContent,
    isComplete: true,
    type: attrs.type || attrs.label,
  };
}

/**
 * Format think block label for display
 */
export function formatThinkLabel(block: ThinkBlock): string {
  if (block.label) return block.label;
  if (block.type) {
    return block.type.charAt(0).toUpperCase() + block.type.slice(1);
  }
  return 'Reasoning';
}

// Legacy compatibility
export class ThinkTagParser {
  parse(text: string): LegacyParsedContent {
    const result = parseThinkTags(text);
    // Convert new format to legacy format for backward compatibility
    const thinking = result.thinking.map(b => b.content).join('\n\n') || null;
    return {
      thinking,
      visible: result.visible,
    };
  }

  stripThinkTags(text: string): string {
    return stripThinkTags(text);
  }

  hasThinkTags(text: string): boolean {
    return hasThinkTags(text);
  }
}

export const thinkTagParser = new ThinkTagParser();
