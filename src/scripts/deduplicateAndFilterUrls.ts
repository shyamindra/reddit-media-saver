import { readFileSync, writeFileSync, existsSync } from 'fs';

interface VideoUrl {
  url: string;
  type: 'redgifs' | 'reddit_video' | 'packaged_media' | 'other';
  quality?: number;
  baseId?: string;
}

class UrlDeduplicator {
  private videoUrls: VideoUrl[] = [];

  /**
   * Parse and categorize video URLs
   */
  private parseVideoUrl(url: string): VideoUrl | null {
    const trimmedUrl = url.trim();
    
    // RedGIFs URLs - handle multiple formats
    if (trimmedUrl.includes('redgifs.com')) {
      // media.redgifs.com format
      if (trimmedUrl.includes('media.redgifs.com')) {
        return {
          url: trimmedUrl,
          type: 'redgifs',
          baseId: trimmedUrl.match(/media\.redgifs\.com\/([^\/]+)/)?.[1]
        };
      }
      
      // watch.redgifs.com format (v1, v2, v3)
      if (trimmedUrl.includes('watch.redgifs.com') || trimmedUrl.includes('v.redgifs.com') || trimmedUrl.includes('v2.redgifs.com') || trimmedUrl.includes('v3.redgifs.com')) {
        const baseId = trimmedUrl.match(/watch\/([^\/\?]+)/)?.[1] || 
                      trimmedUrl.match(/v[23]?\.redgifs\.com\/watch\/([^\/\?]+)/)?.[1];
        return {
          url: trimmedUrl,
          type: 'redgifs',
          baseId
        };
      }
      
      // www.redgifs.com format
      if (trimmedUrl.includes('www.redgifs.com')) {
        const baseId = trimmedUrl.match(/www\.redgifs\.com\/watch\/([^\/\?]+)/)?.[1];
        return {
          url: trimmedUrl,
          type: 'redgifs',
          baseId
        };
      }
    }
    
    // Reddit video URLs (v.redd.it) - handle multiple formats
    if (trimmedUrl.includes('v.redd.it')) {
      const baseId = trimmedUrl.match(/v\.redd\.it\/([a-zA-Z0-9]+)/)?.[1];
      
      // Check for DASH format with quality
      if (trimmedUrl.includes('DASH_')) {
        const qualityMatch = trimmedUrl.match(/DASH_(\d+)\.mp4/);
        const quality = qualityMatch ? parseInt(qualityMatch[1]) : 0;
        return {
          url: trimmedUrl,
          type: 'reddit_video',
          quality,
          baseId
        };
      }
      
      return {
        url: trimmedUrl,
        type: 'reddit_video',
        baseId
      };
    }
    
    // Packaged media URLs (multiple qualities)
    if (trimmedUrl.includes('packaged-media.redd.it')) {
      const baseId = trimmedUrl.match(/packaged-media\.redd\.it\/([a-zA-Z0-9]+)/)?.[1];
      const qualityMatch = trimmedUrl.match(/m2-res_(\d+)p/);
      const quality = qualityMatch ? parseInt(qualityMatch[1]) : 0;
      
      return {
        url: trimmedUrl,
        type: 'packaged_media',
        quality,
        baseId
      };
    }
    
    // Other video URLs
    if (trimmedUrl.includes('.mp4') || trimmedUrl.includes('.webm') || trimmedUrl.includes('.mov')) {
      return {
        url: trimmedUrl,
        type: 'other'
      };
    }
    
    return null;
  }

  /**
   * Load URLs from file and parse them
   */
  loadUrlsFromFile(filename: string = 'extracted_files/all-extracted-video-urls.txt'): void {
    if (!existsSync(filename)) {
      console.log(`❌ File not found: ${filename}`);
      return;
    }

    const content = readFileSync(filename, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    console.log(`📄 Loaded ${lines.length} lines from ${filename}`);
    
    for (const line of lines) {
      // Skip comment lines (post titles) that start with #
      if (line.startsWith('#')) {
        continue;
      }
      
      const videoUrl = this.parseVideoUrl(line);
      if (videoUrl) {
        this.videoUrls.push(videoUrl);
      }
    }
    
    console.log(`📊 Parsed ${this.videoUrls.length} valid video URLs`);
  }

  /**
   * Deduplicate and filter for best quality
   */
  deduplicateAndFilter(): string[] {
    const uniqueUrls: string[] = [];
    const groupedByBaseId: Map<string, VideoUrl[]> = new Map();
    
    // Group URLs by base ID
    for (const videoUrl of this.videoUrls) {
      if (videoUrl.baseId) {
        if (!groupedByBaseId.has(videoUrl.baseId)) {
          groupedByBaseId.set(videoUrl.baseId, []);
        }
        groupedByBaseId.get(videoUrl.baseId)!.push(videoUrl);
      } else {
        // URLs without base ID (like RedGIFs) are unique
        uniqueUrls.push(videoUrl.url);
      }
    }
    
    // For each group, select the best quality
    for (const [baseId, urls] of groupedByBaseId) {
      if (urls.length === 1) {
        // Only one URL, use it
        uniqueUrls.push(urls[0].url);
      } else {
        // Multiple URLs, select the best quality
        const bestUrl = this.selectBestQuality(urls);
        uniqueUrls.push(bestUrl.url);
        console.log(`🎯 Selected best quality for ${baseId}: ${bestUrl.quality}p (${bestUrl.url})`);
      }
    }
    
    return uniqueUrls;
  }

  /**
   * Select the best quality URL from a group
   */
  private selectBestQuality(urls: VideoUrl[]): VideoUrl {
    // Priority order: RedGIFs > Reddit video (highest quality) > packaged media (highest quality)
    
    // First, prefer RedGIFs
    const redgifs = urls.find(url => url.type === 'redgifs');
    if (redgifs) return redgifs;
    
    // Then, prefer Reddit video with highest quality
    const redditVideos = urls.filter(url => url.type === 'reddit_video');
    if (redditVideos.length > 0) {
      return redditVideos.reduce((best, current) => 
        (current.quality || 0) > (best.quality || 0) ? current : best
      );
    }
    
    // Finally, packaged media with highest quality
    const packagedMedia = urls.filter(url => url.type === 'packaged_media');
    if (packagedMedia.length > 0) {
      return packagedMedia.reduce((best, current) => 
        (current.quality || 0) > (best.quality || 0) ? current : best
      );
    }
    
    // Fallback to first URL
    return urls[0];
  }

  /**
   * Save deduplicated URLs to file
   */
  saveDeduplicatedUrls(urls: string[], filename: string = 'extracted_files/deduplicated-video-urls.txt'): void {
    writeFileSync(filename, urls.join('\n'), 'utf8');
    console.log(`💾 Saved ${urls.length} deduplicated URLs to ${filename}`);
  }

  /**
   * Print summary statistics
   */
  printSummary(originalCount: number, deduplicatedCount: number): void {
    console.log('\n📊 Deduplication Summary:');
    console.log(`   Original URLs: ${originalCount}`);
    console.log(`   Deduplicated URLs: ${deduplicatedCount}`);
    console.log(`   Removed duplicates: ${originalCount - deduplicatedCount}`);
    console.log(`   Reduction: ${((originalCount - deduplicatedCount) / originalCount * 100).toFixed(1)}%`);
  }
}

/**
 * Main function
 */
async function main() {
  const deduplicator = new UrlDeduplicator();
  
  // Load URLs
  deduplicator.loadUrlsFromFile();
  
  if (deduplicator['videoUrls'].length === 0) {
    console.log('❌ No valid video URLs found');
    return;
  }
  
  // Deduplicate and filter
  const originalCount = deduplicator['videoUrls'].length;
  const deduplicatedUrls = deduplicator.deduplicateAndFilter();
  
  // Save results
  deduplicator.saveDeduplicatedUrls(deduplicatedUrls);
  deduplicator.printSummary(originalCount, deduplicatedUrls.length);
  
  console.log('\n✅ Deduplication complete!');
  console.log('🚀 Ready to download with: npm run ytdlp-download');
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { UrlDeduplicator, main }; 