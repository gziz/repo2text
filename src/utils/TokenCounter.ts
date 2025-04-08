import {Tiktoken} from 'tiktoken/lite';
const cl100k_base = require("tiktoken/encoders/cl100k_base.json");
import { TOKEN_CACHE_INVALIDATION_MS } from './constants';

/**
 * Utility class for counting tokens using the tiktoken library
 */
export class TokenCounter {
  // Cache the encoder instance for better performance
  private static encoder: any = null;
  
  // Cache for file token counts: Map<filePath, {tokenCount, timestamp}>
  private static tokenCache: Map<string, {count: number, timestamp: number}> = new Map();

  /**
   * Get the encoder instance (cached for performance)
   */
  private static getEncoder(): any {
    if (!this.encoder) {
      // Using cl100k_base encoder which is used by GPT-4 and GPT-3.5-Turbo
      const encoder = new Tiktoken(
        cl100k_base.bpe_ranks,
        cl100k_base.special_tokens,
        cl100k_base.pat_str
      );
      
      this.encoder = encoder;
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
   * Count tokens in a file, using cache when possible
   * @param filePath Path to the file
   * @param content Content of the file
   * @returns The number of tokens in the file
   */
  public static countFileTokens(filePath: string, content: string): number {
    const cacheKey = filePath;
    
    // Get current timestamp
    const now = Date.now();
    
    // Check if we have a cached value that's less than 1 hour old
    // (assuming file content doesn't change during a single VS Code session)
    const cached = this.tokenCache.get(cacheKey);
    if (cached && now - cached.timestamp < TOKEN_CACHE_INVALIDATION_MS) {
      console.log(`Using cached token count for ${filePath}`);
      return cached.count;
    }
    
    // Calculate token count for the file
    const contentTokens = this.countTokens(content);
    const pathTokens = this.countTokens(filePath) + 5; // +5 for markup and separators
    const totalTokens = contentTokens + pathTokens;
    
    // Store in cache
    this.tokenCache.set(cacheKey, { count: totalTokens, timestamp: now });
    
    return totalTokens;
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
      totalTokens += this.countFileTokens(file.path, file.content);
    }
    
    return totalTokens;
  }
  
  /**
   * Clear the token cache
   */
  public static clearCache(): void {
    this.tokenCache.clear();
  }
} 