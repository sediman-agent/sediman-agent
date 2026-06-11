import { thinkTagParser } from '@/utils/thinkTagParser';

describe('ThinkTagParser', () => {
  describe('parse', () => {
    it('should extract thinking content from <think/> tags', () => {
      const input = '<think I need to analyze this request.</think > Visible content here';
      const result = thinkTagParser.parse(input);

      expect(result.thinking).toBe('I need to analyze this request.');
      expect(result.visible).toBe('Visible content here');
    });

    it('should handle multiline thinking content', () => {
      const input = `<think
First, I'll break down the problem.
Then, I'll consider the options.
Finally, I'll provide a solution.
</think > The answer is 42.`;
      const result = thinkTagParser.parse(input);

      expect(result.thinking).toContain('First, I\'ll break down the problem.');
      expect(result.thinking).toContain('Then, I\'ll consider the options.');
      expect(result.thinking).toContain('Finally, I\'ll provide a solution.');
      expect(result.visible).toBe('The answer is 42.');
    });

    it('should handle content without think tags', () => {
      const input = 'Just normal content without any thinking tags.';
      const result = thinkTagParser.parse(input);

      expect(result.thinking).toBeNull();
      expect(result.visible).toBe('Just normal content without any thinking tags.');
    });

    it('should handle multiple think tags', () => {
      const input = '<think> First thought</think > Some text <think> Second thought</think > More text';
      const result = thinkTagParser.parse(input);

      // Should remove all think tags
      expect(result.visible).toBe('Some text More text');
    });

    it('should handle think tags with attributes', () => {
      const input = '<think lang="en">English thinking</think > Content';
      const result = thinkTagParser.parse(input);

      expect(result.thinking).toBe('English thinking');
      expect(result.visible).toBe('Content');
    });

    it('should handle empty think tags', () => {
      const input = '<think />Just content';
      const result = thinkTagParser.parse(input);

      expect(result.thinking).toBeNull(); // Empty think tags return null
      expect(result.visible).toBe('Just content');
    });

    it('should handle content with only think tags', () => {
      const input = '<think Only thinking here</think >';
      const result = thinkTagParser.parse(input);

      expect(result.thinking).toBe('Only thinking here');
      expect(result.visible).toBe('');
    });
  });

  describe('stripThinkTags', () => {
    it('should remove all think tags from text', () => {
      const input = '<think Hidden</think > Visible <think More hidden</think > End';
      const result = thinkTagParser.stripThinkTags(input);

      expect(result).toBe('Visible End');
    });

    it('should return original text if no think tags present', () => {
      const input = 'Just normal text';
      const result = thinkTagParser.stripThinkTags(input);

      expect(result).toBe('Just normal text');
    });
  });

  describe('hasThinkTags', () => {
    it('should return true when think tags are present', () => {
      const input = '<thinkSome thinking</think Content';
      expect(thinkTagParser.hasThinkTags(input)).toBe(true);
    });

    it('should return false when no think tags are present', () => {
      const input = 'Just normal content';
      expect(thinkTagParser.hasThinkTags(input)).toBe(false);
    });
  });
});
