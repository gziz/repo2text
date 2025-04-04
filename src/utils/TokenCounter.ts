import * as tiktoken from 'tiktoken';

/**
 * Utility class for counting tokens using the tiktoken library
 */
export class TokenCounter {
  // Cache the encoder instance for better performance
  private static encoder: any = null;

  /**
   * Get the encoder instance (cached for performance)
   */
  private static getEncoder(): any {
    if (!this.encoder) {
      // Using cl100k_base encoder which is used by GPT-4 and GPT-3.5-Turbo
      this.encoder = tiktoken.get_encoding("cl100k_base");
    }
    return this.encoder;
  }

  /**
   * Count tokens in a text string
   * @param text The text to count tokens in
   * @returns The number of tokens in the text
   */
  public static countTokens(text: string): number {
    if (!text) return 0;
    
    const encoder = this.getEncoder();
    const tokens = encoder.encode(text);
    return tokens.length;
  }

  /**
   * Count tokens in multiple file contents
   * @param fileContents Array of file content objects
   * @returns The total number of tokens
   */
  public static countTokensInFiles(fileContents: Array<{path: string, content: string}>): number {
    if (!fileContents || fileContents.length === 0) return 0;
    
    let totalTokens = 0;
    for (const file of fileContents) {
      totalTokens += this.countTokens(file.content);
      // Add tokens for path and separators (rough estimate)
      totalTokens += this.countTokens(file.path) + 5; // +5 for markup and separators
    }
    
    return totalTokens;
  }
} 