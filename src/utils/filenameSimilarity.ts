export interface SimilarityResult {
  similarity: number;
  commonParts: string[];
  differences: string[];
}

export class FilenameSimilarity {
  /**
   * Calculate similarity between two filenames
   */
  public static calculateSimilarity(filename1: string, filename2: string): SimilarityResult {
    const name1 = this.normalizeFilename(filename1);
    const name2 = this.normalizeFilename(filename2);

    const parts1 = name1.split('_');
    const parts2 = name2.split('_');

    const commonParts: string[] = [];
    const differences: string[] = [];

    // Compare parts
    const maxLength = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || '';
      const part2 = parts2[i] || '';

      if (part1 === part2 && part1.length > 0) {
        commonParts.push(part1);
      } else {
        if (part1.length > 0) differences.push(part1);
        if (part2.length > 0) differences.push(part2);
      }
    }

    // Calculate similarity score
    const totalParts = Math.max(parts1.length, parts2.length);
    const similarity = totalParts > 0 ? commonParts.length / totalParts : 0;

    return {
      similarity,
      commonParts,
      differences
    };
  }

  /**
   * Group filenames by similarity
   */
  public static groupBySimilarity(
    filenames: string[],
    threshold: number = 0.7
  ): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();

    for (const filename of filenames) {
      if (processed.has(filename)) continue;

      const group = [filename];
      processed.add(filename);

      for (const otherFilename of filenames) {
        if (processed.has(otherFilename)) continue;

        const similarity = this.calculateSimilarity(filename, otherFilename);
        if (similarity.similarity >= threshold) {
          group.push(otherFilename);
          processed.add(otherFilename);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Extract common prefix from a group of filenames
   */
  public static extractCommonPrefix(filenames: string[]): string {
    if (filenames.length === 0) return '';

    const normalizedNames = filenames.map(name => this.normalizeFilename(name));
    const parts = normalizedNames.map(name => name.split('_'));

    const commonParts: string[] = [];
    const minLength = Math.min(...parts.map(p => p.length));

    for (let i = 0; i < minLength; i++) {
      const firstPart = parts[0][i];
      const allSame = parts.every(part => part[i] === firstPart);

      if (allSame) {
        commonParts.push(firstPart);
      } else {
        break;
      }
    }

    return commonParts.join('_');
  }

  /**
   * Extract subreddit from filename
   */
  public static extractSubreddit(filename: string): string {
    const parts = this.normalizeFilename(filename).split('_');
    return parts.length >= 2 ? parts[1] : '';
  }

  /**
   * Extract author from filename
   */
  public static extractAuthor(filename: string): string {
    const parts = this.normalizeFilename(filename).split('_');
    return parts.length >= 3 ? parts[2] : '';
  }

  /**
   * Extract title from filename
   */
  public static extractTitle(filename: string): string {
    const parts = this.normalizeFilename(filename).split('_');
    return parts.length >= 1 ? parts[0] : '';
  }

  /**
   * Normalize filename for comparison
   */
  public static normalizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-z0-9_]/g, '_') // Replace non-alphanumeric with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  /**
   * Check if two filenames are from the same subreddit
   */
  public static isSameSubreddit(filename1: string, filename2: string): boolean {
    const subreddit1 = this.extractSubreddit(filename1);
    const subreddit2 = this.extractSubreddit(filename2);
    return subreddit1 === subreddit2 && subreddit1.length > 0;
  }

  /**
   * Check if two filenames are from the same author
   */
  public static isSameAuthor(filename1: string, filename2: string): boolean {
    const author1 = this.extractAuthor(filename1);
    const author2 = this.extractAuthor(filename2);
    return author1 === author2 && author1.length > 0;
  }

  /**
   * Generate group name from filenames
   */
  public static generateGroupName(filenames: string[]): string {
    if (filenames.length === 0) return '';

    // Try to use common subreddit
    const subreddits = filenames.map(f => this.extractSubreddit(f));
    const uniqueSubreddits = [...new Set(subreddits)].filter(s => s.length > 0);

    if (uniqueSubreddits.length === 1) {
      return uniqueSubreddits[0];
    }

    // Try to use common author
    const authors = filenames.map(f => this.extractAuthor(f));
    const uniqueAuthors = [...new Set(authors)].filter(a => a.length > 0);

    if (uniqueAuthors.length === 1) {
      return uniqueAuthors[0];
    }

    // Use common prefix
    const commonPrefix = this.extractCommonPrefix(filenames);
    if (commonPrefix.length > 0) {
      return commonPrefix;
    }

    // Fallback to first filename's title
    return this.extractTitle(filenames[0]);
  }

  /**
   * Calculate Jaccard similarity between two sets of words
   */
  public static jaccardSimilarity(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate cosine similarity between two word vectors
   */
  public static cosineSimilarity(words1: string[], words2: string[]): number {
    const allWords = [...new Set([...words1, ...words2])];
    const vector1 = allWords.map(word => words1.filter(w => w === word).length);
    const vector2 = allWords.map(word => words2.filter(w => w === word).length);

    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

    return magnitude1 * magnitude2 > 0 ? dotProduct / (magnitude1 * magnitude2) : 0;
  }
} 