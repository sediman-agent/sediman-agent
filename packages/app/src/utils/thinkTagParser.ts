/**
 * Parser for extracting thinking content from <think/> tags
 */

export interface ParsedContent {
  thinking: string | null;
  visible: string;
}

export class ThinkTagParser {
  // Handle both <think/> and <thinking/> tag formats
  // Make the > optional to handle formats like <thinkcontent</think
  private static THINK_RE = /<(?:think|thinking)(?:\s[^>]*>)?\s*([\s\S]*?)<\/(?:think|thinking)>?/gi;
  private static THINK_RE_EXTRACT = /<(?:think|thinking)(?:\s[^>]*>)?\s*([\s\S]*?)<\/(?:think|thinking)>?/i;
  private static EMPTY_THINK_RE = /<(?:think|thinking)(?:\s[^>]*>)?\s*<\/(?:think|thinking)>?/gi;
  private static SELF_CLOSING_THINK_RE = /<(?:think|thinking)(?:\s*|\/)?>/gi;

  /**
   * Parse text to extract thinking content and visible content
   */
  parse(text: string): ParsedContent {
    const thinkMatch = text.match(ThinkTagParser.THINK_RE_EXTRACT);
    const thinking = thinkMatch ? thinkMatch[1].trim() : null;
    const visible = this.stripThinkTags(text);
    return { thinking, visible };
  }

  /**
   * Remove all think tags from text
   */
  stripThinkTags(text: string): string {
    // First, remove self-closing think tags <think/>
    let stripped = text.replace(ThinkTagParser.SELF_CLOSING_THINK_RE, "");
    // Then, remove empty think tags <think ></think >
    stripped = stripped.replace(ThinkTagParser.EMPTY_THINK_RE, "");
    // Finally, remove non-empty think tags with content
    stripped = stripped.replace(ThinkTagParser.THINK_RE, "");
    // Clean up extra whitespace and trim
    stripped = stripped.replace(/\s+/g, " ").trim();
    // If stripping resulted in empty string, return original without think tags
    return stripped || text.replace(ThinkTagParser.THINK_RE, "").replace(/\s+/g, " ").trim();
  }

  /**
   * Check if text contains think tags
   */
  hasThinkTags(text: string): boolean {
    return ThinkTagParser.THINK_RE_EXTRACT.test(text);
  }
}

// Singleton instance
export const thinkTagParser = new ThinkTagParser();
