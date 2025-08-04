import { readFileSync, writeFileSync, existsSync } from 'fs';

interface MediaUrlEntry {
  title: string;
  url: string;
  type: 'image' | 'gif' | 'text';
}

class MediaUrlDeduplicator {
  private originalUrls: MediaUrlEntry[] = [];
  private deduplicatedUrls: MediaUrlEntry[] = [];

  /**
   * Load URLs from the extracted media URLs file
   */
  loadUrlsFromFile(filePath: string = 'extracted_files/all-extracted-media-urls.txt'): MediaUrlEntry[] {
    if (!existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return [];
    }
    
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const entries: MediaUrlEntry[] = [];
    let currentTitle = '';
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        // This is a title line
        currentTitle = line.substring(2).trim();
      } else if (line.startsWith('http') && currentTitle) {
        // This is a URL line
        const url = line.trim();
        const type = this.detectMediaType(url);
        
        entries.push({
          title: currentTitle,
          url: url,
          type: type
        });
      }
    }
    
    console.log(`📝 Loaded ${entries.length} media URLs from ${filePath}`);
    return entries;
  }

  /**
   * Detect media type from URL
   */
  private detectMediaType(url: string): 'image' | 'gif' | 'text' {
    if (url.includes('.gif') || url.includes('gfycat.com')) {
      return 'gif';
    }
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || 
        url.includes('.webp') || url.includes('i.redd.it') || url.includes('i.imgur.com')) {
      return 'image';
    }
    return 'text';
  }

  /**
   * Get base URL without query parameters
   */
  private getBaseUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }

  /**
   * Check if two URLs are the same media (different quality/resolution)
   */
  private isSameMedia(url1: string, url2: string): boolean {
    const base1 = this.getBaseUrl(url1);
    const base2 = this.getBaseUrl(url2);
    
    // If base URLs are the same, they're the same media
    if (base1 === base2) {
      return true;
    }
    
    // Check for common patterns where URLs might be the same media
    // e.g., different imgur URLs for the same image
    const imgurPattern1 = base1.match(/i\.imgur\.com\/([a-zA-Z0-9]+)/);
    const imgurPattern2 = base2.match(/i\.imgur\.com\/([a-zA-Z0-9]+)/);
    
    if (imgurPattern1 && imgurPattern2 && imgurPattern1[1] === imgurPattern2[1]) {
      return true;
    }
    
    // Check for Reddit image patterns
    const redditPattern1 = base1.match(/i\.redd\.it\/([a-zA-Z0-9]+)/);
    const redditPattern2 = base2.match(/i\.redd\.it\/([a-zA-Z0-9]+)/);
    
    if (redditPattern1 && redditPattern2 && redditPattern1[1] === redditPattern2[1]) {
      return true;
    }
    
    return false;
  }

  /**
   * Select the best quality URL from a group of similar URLs
   */
  private selectBestQualityUrl(urls: string[]): string {
    if (urls.length === 1) {
      return urls[0];
    }
    
    // Priority order for quality selection
    const qualityPatterns = [
      /\.png$/i,           // PNG (usually highest quality)
      /\.webp$/i,          // WebP (good quality, smaller size)
      /\.jpg$/i,           // JPG
      /\.jpeg$/i,          // JPEG
      /\.gif$/i,           // GIF
      /i\.imgur\.com/,     // Imgur (usually good quality)
      /i\.redd\.it/,       // Reddit images
    ];
    
    for (const pattern of qualityPatterns) {
      const matches = urls.filter(url => pattern.test(url));
      if (matches.length > 0) {
        return matches[0];
      }
    }
    
    // If no pattern matches, return the first URL
    return urls[0];
  }

  /**
   * Deduplicate and filter URLs
   */
  deduplicateAndFilter(): void {
    console.log('🔄 Starting deduplication process...');
    
    // Group URLs by similarity
    const urlGroups = new Map<string, string[]>();
    
    for (const entry of this.originalUrls) {
      let grouped = false;
      
      // Check if this URL belongs to an existing group
      for (const [groupKey, urls] of urlGroups) {
        if (this.isSameMedia(entry.url, groupKey)) {
          urls.push(entry.url);
          grouped = true;
          break;
        }
      }
      
      // If not grouped, create a new group
      if (!grouped) {
        urlGroups.set(entry.url, [entry.url]);
      }
    }
    
    console.log(`📊 Found ${urlGroups.size} unique media items from ${this.originalUrls.length} URLs`);
    
    // Select the best quality URL from each group
    for (const [groupKey, urls] of urlGroups) {
      const bestUrl = this.selectBestQualityUrl(urls);
      
      // Find the original entry for this URL to preserve the title
      const originalEntry = this.originalUrls.find(entry => entry.url === bestUrl);
      
      if (originalEntry) {
        this.deduplicatedUrls.push({
          title: originalEntry.title,
          url: bestUrl,
          type: originalEntry.type
        });
      }
    }
    
    console.log(`✅ Deduplication completed: ${this.originalUrls.length} → ${this.deduplicatedUrls.length} URLs`);
  }

  /**
   * Save deduplicated URLs to file
   */
  saveDeduplicatedUrls(filename: string = 'extracted_files/deduplicated-media-urls.txt'): void {
    let content = '';
    
    for (const entry of this.deduplicatedUrls) {
      content += `# ${entry.title}\n${entry.url}\n\n`;
    }
    
    writeFileSync(filename, content, 'utf8');
    console.log(`💾 Saved ${this.deduplicatedUrls.length} deduplicated URLs to ${filename}`);
  }

  /**
   * Save deduplicated URLs as a simple list (without titles)
   */
  saveDeduplicatedUrlsList(filename: string = 'extracted_files/deduplicated-media-urls-list.txt'): void {
    const urls = this.deduplicatedUrls.map(entry => entry.url);
    const content = urls.join('\n');
    
    writeFileSync(filename, content, 'utf8');
    console.log(`💾 Saved ${urls.length} deduplicated URLs to ${filename}`);
  }

  /**
   * Get statistics about the deduplication
   */
  getStatistics(): {
    original: number;
    deduplicated: number;
    reduction: number;
    reductionPercent: number;
  } {
    const original = this.originalUrls.length;
    const deduplicated = this.deduplicatedUrls.length;
    const reduction = original - deduplicated;
    const reductionPercent = original > 0 ? (reduction / original) * 100 : 0;
    
    return {
      original,
      deduplicated,
      reduction,
      reductionPercent
    };
  }

  /**
   * Main deduplication process
   */
  async deduplicateUrls(inputFile: string = 'extracted_files/all-extracted-media-urls.txt'): Promise<void> {
    console.log('🚀 Starting media URL deduplication...');
    
    // Load URLs
    this.originalUrls = this.loadUrlsFromFile(inputFile);
    
    if (this.originalUrls.length === 0) {
      console.log('❌ No URLs found to deduplicate');
      return;
    }
    
    // Perform deduplication
    this.deduplicateAndFilter();
    
    // Save results
    this.saveDeduplicatedUrls();
    this.saveDeduplicatedUrlsList();
    
    // Print statistics
    const stats = this.getStatistics();
    console.log('\n📊 Deduplication Statistics:');
    console.log(`📹 Original URLs: ${stats.original}`);
    console.log(`✅ Deduplicated URLs: ${stats.deduplicated}`);
    console.log(`🗑️  Removed duplicates: ${stats.reduction}`);
    console.log(`📉 Reduction: ${stats.reductionPercent.toFixed(1)}%`);
    
    console.log('\n🎉 Media URL deduplication completed!');
  }
}

async function main() {
  const deduplicator = new MediaUrlDeduplicator();
  
  try {
    await deduplicator.deduplicateUrls();
  } catch (error) {
    console.error('❌ Error during deduplication:', error);
  }
}

// Run the main function
main(); 