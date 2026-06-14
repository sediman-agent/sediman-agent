/**
 * Enhanced parser for extracting thinking content from <think/> tags
 * Supports attributes like type, label, and streaming updates
 * Also filters common implicit reasoning patterns
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

// Think-tag parser.
//
// Real LLM output is sloppy: opening tags frequently lack their closing `>`
// (e.g. `<think reasoning here</think >`) and the closing tag often carries a
// stray space (`</think >`) or even no `>` at all (`<think ... </think`).
// To stay useful as a streaming parser we match the well-formed variant and
// the two common malformed variants the tests cover:
//
//   <think>content</think>            well-formed
//   <think attrs>content</think >     attributes + stray space in close
//   <think content</think >           missing `>` in open  (very common)
//   <thinkContent</think              no separators at all
//
// The regex has two branches:
//   branch A (well-formed): `(?:\s+([^<>]*?))?>([\s\S]*?)` — optional attrs,
//                            a real `>`, then content.
//   branch B (malformed):   `([\s\S]+?)` — everything after `<think` until the
//                            close tag (no `>` was emitted).
//
// Group 1 = optional attributes, Group 2 = content (branch A),
// Group 3 = content (branch B).
const THINK_TAG_REGEX =
  /<(?:think|thinking)(?:(?:\s+([^<>]*?))?>([\s\S]*?)|([\s\S]+?))<\/(?:think|thinking)\s*>?/gi;
const THINK_ATTRS_REGEX = /(\w+)=["']([^"']*)["']/g;

// Common implicit reasoning patterns to filter out
const REASONING_PATTERNS = [
  /^(The user wants me to|Let me|I should|I need to|I'll|I'm going to|I plan to|I will|The goal is to|My plan is|Strategy:)/,
  /^(First|Next|Then|After that|Finally|Now|OK|Alright|So|Well|Actually|However)/,
  /^(I'll try|I can|Let me try|Let me attempt|I should try|Going to|Try to|Attempting to)/,
  /^(I think|I believe|I suspect|I guess|I assume)/,
  /^(I'm|I was|I've been|I've|We're|We've been)/,
  /^(Note:|IMPORTANT:|WARNING:|ERROR:)/
];

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
 * Filter out implicit reasoning patterns from visible content
 * NOTE: This function is disabled to prevent filtering legitimate content.
 * The thinking content is now handled separately via the onThinking callback.
 */
export function filterReasoningPatterns(text: string): string {
  // Return the original text without filtering to preserve all content
  // The thinking content is handled separately and displayed in the ThinkingBlock
  return text;
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
    // Group 1 = attributes (well-formed open: `<think attrs>`)
    // Group 2 = content from a well-formed open tag
    // Group 3 = content from a malformed open tag (`<think content` with no `>`)
    const attrString = match[1];
    const rawContent = match[2] !== undefined ? match[2] : (match[3] ?? '');
    const attrs = parseAttributes(attrString);

    thinkBlocks.push({
      // Collapse surrounding whitespace introduced by the sloppy tag form.
      content: rawContent.replace(/^\s+|\s+$/g, ''),
      type: attrs.type || attrs.label || undefined,
      label: attrs.label || attrs.type || undefined,
      confidence: attrs.confidence ? parseFloat(attrs.confidence) : undefined,
    });

    // Remove the think tag from visible content
    visible = visible.replace(match[0], '');

    // Guard against zero-length matches (could otherwise loop infinitely).
    if (match[0] === '') {
      THINK_TAG_REGEX.lastIndex++;
    }
  }

  // Also strip self-closing tags like `<think />` — they carry no content, so
  // they don't appear in thinkBlocks, but they must be removed from visible
  // output and must not set hasThinking.
  visible = visible.replace(/<(?:think|thinking)\s*\/>/gi, '');

  // Clean up extra whitespace
  visible = visible.replace(/\s+/g, ' ').trim();

  // Filter out implicit reasoning patterns from visible content
  visible = filterReasoningPatterns(visible);

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
  if (THINK_TAG_REGEX.test(text)) return true;
  // Also recognize self-closing (`<think />`) and the malformed open+close
  // forms that the main regex handles.
  return /<(?:think|thinking)\b/i.test(text);
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
