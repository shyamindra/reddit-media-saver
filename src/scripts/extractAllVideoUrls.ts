import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

interface RedditPost {
  url: string;
  title: string;
  subreddit: string;
  author: string;
}

interface ExtractionResult {
  success: boolean;
  post: RedditPost;
  videoUrls: string[];
  error?: string;
}

class VideoUrlExtractor {
  private userAgent = 'RedditSaverApp/1.0.0 (by /u/reddit_user)';
  private extractedUrls: Map<string, string[]> = new Map(); // title -> URLs
  private failedRequests: RedditPost[] = [];

  /**
   * Clear existing files and start fresh
   */
  private clearExistingFiles(): void {
    const filesToClear = [
      'all-extracted-video-urls.txt',
      'failed-extraction-requests.txt'
    ];

    filesToClear.forEach(filename => {
      if (existsSync(filename)) {
        try {
          writeFileSync(filename, '', 'utf8');
          console.log(`🗑️  Cleared existing file: ${filename}`);
        } catch (error) {
          console.log(`⚠️  Could not clear ${filename}: ${error}`);
        }
      }
    });
  }

  /**
   * Read CSV files from reddit-links directory
   */
  private readCsvFiles(): RedditPost[] {
    const redditLinksDir = 'reddit-links';
    const posts: RedditPost[] = [];

    if (!existsSync(redditLinksDir)) {
      console.log(`❌ Directory not found: ${redditLinksDir}`);
      return posts;
    }

    const files = readdirSync(redditLinksDir).filter(file => file.endsWith('.csv'));
    console.log(`📁 Found ${files.length} CSV files in ${redditLinksDir}/`);

    for (const file of files) {
      const filePath = join(redditLinksDir, file);
      console.log(`📄 Processing: ${file}`);
      
      try {
        const content = readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        // Skip header if exists
        const dataLines = lines[0].includes('id') || lines[0].includes('url') ? lines.slice(1) : lines;
        
        for (const line of dataLines) {
          const columns = line.split(',');
          if (columns.length >= 2) {
            // Handle different CSV formats
            let url: string;
            let title: string;
            let subreddit: string;
            let author: string;

            if (columns[0]?.includes('http')) {
              // Format: url,title,subreddit,author
              url = columns[0]?.trim();
              title = columns[1]?.trim() || 'Unknown';
              subreddit = columns[2]?.trim() || 'Unknown';
              author = columns[3]?.trim() || 'Unknown';
            } else {
              // Format: id,permalink (extract info from permalink)
              url = columns[1]?.trim();
              const permalink = columns[1]?.trim();
              
              if (permalink) {
                // Extract subreddit from permalink: /r/subreddit/comments/id/title/
                const subredditMatch = permalink.match(/\/r\/([^\/]+)\/comments\//);
                subreddit = subredditMatch ? subredditMatch[1] : 'Unknown';
                
                // Extract title from permalink
                const titleMatch = permalink.match(/\/comments\/[^\/]+\/([^\/]+)/);
                title = titleMatch ? titleMatch[1].replace(/_/g, ' ') : 'Unknown';
                
                author = 'Unknown'; // Not available in this format
              } else {
                continue; // Skip invalid lines
              }
            }
            
            if (url && url.startsWith('http')) {
              posts.push({ url, title, subreddit, author });
            }
          }
        }
        
        console.log(`   Found ${dataLines.length} URLs in ${file}`);
      } catch (error) {
        console.error(`❌ Error reading ${file}: ${error}`);
      }
    }

    return posts;
  }

  /**
   * Extract video URLs from a Reddit post
   */
  private async extractVideoUrlsFromPost(post: RedditPost): Promise<ExtractionResult> {
    const videoUrls: string[] = [];
    
    try {
      // Convert Reddit URL to JSON API endpoint
      const jsonUrl = post.url.replace(/\/$/, '') + '.json';
      const response = await axios.get(jsonUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });

      const postData = response.data?.[0]?.data?.children?.[0]?.data;
      if (!postData) {
        return {
          success: false,
          post,
          videoUrls: [],
          error: 'No post data found'
        };
      }

      // Check if it's a video post
      if (postData.is_video) {
        // Get video URLs
        if (postData.media?.reddit_video?.fallback_url) {
          videoUrls.push(postData.media.reddit_video.fallback_url);
        }
        if (postData.media?.reddit_video?.dash_url) {
          videoUrls.push(postData.media.reddit_video.dash_url);
        }
        if (postData.media?.reddit_video?.hls_url) {
          videoUrls.push(postData.media.reddit_video.hls_url);
        }
      }

      // Check for RedGIFs URLs
      if (postData.url && postData.url.includes('redgifs.com')) {
        videoUrls.push(postData.url);
      }

      // Check for other video URLs in the post
      if (postData.url && (postData.url.includes('.mp4') || postData.url.includes('v.redd.it'))) {
        videoUrls.push(postData.url);
      }

      // Check for video URLs in the post content
      if (postData.selftext) {
        const urlMatches = postData.selftext.match(/https?:\/\/[^\s]+\.(mp4|webm|mov)/gi);
        if (urlMatches) {
          videoUrls.push(...urlMatches);
        }
      }

      // Check for video URLs in media gallery
      if (postData.gallery_data && postData.media_metadata) {
        for (const item of postData.gallery_data.items) {
          const mediaId = item.media_id;
          const metadata = postData.media_metadata[mediaId];
          if (metadata && metadata.m && metadata.m.includes('video')) {
            // This is a video in the gallery
            console.log(`🎬 Found video in gallery: ${post.title}`);
          }
        }
      }

      return {
        success: true,
        post,
        videoUrls
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        post,
        videoUrls: [],
        error: errorMessage
      };
    }
  }

  /**
   * Process all posts and extract video URLs
   */
  async extractAllVideoUrls(): Promise<string[]> {
    console.log('🔍 Starting video URL extraction from saved Reddit posts...\n');

    // Clear existing files
    this.clearExistingFiles();

    const posts = this.readCsvFiles();
    console.log(`📊 Total posts to process: ${posts.length}\n`);

    let processed = 0;
    let videosFound = 0;
    let successful = 0;
    let failed = 0;
    const batchSize = 50;
    const batchDelay = 45000; // 45 seconds
    const startIndex = 200; // Start from post 201 (index 200)

    console.log(`🚀 Starting from post ${startIndex + 1} (skipping first ${startIndex} posts)\n`);

    for (let i = startIndex; i < posts.length; i++) {
      const post = posts[i];
      processed++;
      console.log(`[${i + 1}/${posts.length}] Processing: ${post.title} (r/${post.subreddit})`);
      
      const result = await this.extractVideoUrlsFromPost(post);
      
      if (result.success) {
        successful++;
        if (result.videoUrls.length > 0) {
          console.log(`   🎬 Found ${result.videoUrls.length} video URLs`);
          this.extractedUrls.set(result.post.title, result.videoUrls);
          videosFound += result.videoUrls.length;
        }
      } else {
        // Check if it's a 429 error (rate limiting)
        if (result.error && result.error.includes('429')) {
          console.log(`   ⚠️  Rate limited (429). Pausing for 240 seconds before continuing...`);
          await new Promise(resolve => setTimeout(resolve, 240000));
          console.log(`   ✅ Pause complete. Continuing to next post...`);
          failed++;
          this.failedRequests.push(post);
        } else {
          failed++;
          console.log(`   ❌ Failed: ${result.error}`);
          this.failedRequests.push(post);
        }
      }

      // Save URLs in batches every 50 requests
      if (processed % batchSize === 0) {
        const batchFilename = `extracted-video-urls-batch-${Math.floor(processed / batchSize)}.txt`;
        this.saveUrlsToFile(this.extractedUrls, batchFilename);
        console.log(`\n💾 Saved batch ${Math.floor(processed / batchSize)}: ${this.extractedUrls.size} posts with video URLs to ${batchFilename}`);
        
        // 45-second delay after every 50 requests
        if (i < posts.length - 1) {
          console.log(`\n🔄 Processed ${processed} requests. Taking a 45-second break...\n`);
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
      } else {
        // 2-second delay between individual requests
        if (i < posts.length - 1) {
          console.log('   ⏱️  Waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Save final batch if not already saved
    if (processed % batchSize !== 0) {
      const finalBatchFilename = `extracted-video-urls-batch-final.txt`;
      this.saveUrlsToFile(this.extractedUrls, finalBatchFilename);
      console.log(`\n💾 Saved final batch: ${this.extractedUrls.size} posts with video URLs to ${finalBatchFilename}`);
    }

    // Save complete list
    this.saveUrlsToFile(this.extractedUrls, 'all-extracted-video-urls.txt');
    
    // Save failed requests in key-value format
    this.saveFailedRequests();
    
    console.log('\n📊 Extraction Summary:');
    console.log(`   Total posts processed: ${processed}`);
    console.log(`   Successful requests: ${successful}`);
    console.log(`   Failed requests: ${failed}`);
    console.log(`   Total video URLs found: ${videosFound}`);
    console.log(`   Posts with videos: ${this.extractedUrls.size}`);

    // Return all URLs as a flat array for compatibility
    const allUrls: string[] = [];
    for (const urls of this.extractedUrls.values()) {
      allUrls.push(...urls);
    }
    return allUrls;
  }

  /**
   * Retry failed posts with proper 429 error handling
   * This method retries individual failed posts instead of entire batches
   */
  private async retryFailedPostsWith429Handling(failedPosts: RedditPost[]): Promise<{
    successful: number;
    failed: number;
    videosFound: number;
  }> {
    let successful = 0;
    let failed = 0;
    let videosFound = 0;
    let retryAttempt = 1;
    const maxRetryAttempts = 5; // Prevent infinite loops
    let remainingPosts = [...failedPosts];

    while (remainingPosts.length > 0 && retryAttempt <= maxRetryAttempts) {
      console.log(`   ⏱️  Waiting 240 seconds before retry attempt ${retryAttempt}...`);
      await new Promise(resolve => setTimeout(resolve, 240000));
      
      const currentBatch = [...remainingPosts];
      remainingPosts = [];
      let batchSuccessful = 0;
      let batchFailed = 0;
      let batchVideosFound = 0;

      console.log(`   🔄 Retry attempt ${retryAttempt}: Processing ${currentBatch.length} failed posts...`);

      for (let i = 0; i < currentBatch.length; i++) {
        const post = currentBatch[i];
        console.log(`   🔄 Retry attempt ${retryAttempt}: ${post.title} (r/${post.subreddit})`);
        
        const result = await this.extractVideoUrlsFromPost(post);
        
        if (result.success) {
          batchSuccessful++;
          if (result.videoUrls.length > 0) {
            console.log(`      🎬 Found ${result.videoUrls.length} video URLs`);
            this.extractedUrls.set(result.post.title, result.videoUrls);
            batchVideosFound += result.videoUrls.length;
          }
        } else {
          if (result.error && result.error.includes('429')) {
            console.log(`      ⚠️  Still rate limited (429) on retry attempt ${retryAttempt}`);
            remainingPosts.push(post); // Add back to retry queue
            batchFailed++;
          } else {
            batchFailed++;
            console.log(`      ❌ Failed: ${result.error}`);
            this.failedRequests.push(post);
          }
        }
        
        // Small delay between retry requests
        if (i < currentBatch.length - 1) {
          console.log('      ⏱️  Waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      successful += batchSuccessful;
      failed += batchFailed;
      videosFound += batchVideosFound;

      if (remainingPosts.length > 0 && retryAttempt < maxRetryAttempts) {
        console.log(`   ⚠️  Retry attempt ${retryAttempt} complete. ${remainingPosts.length} posts still failed. Will retry again...`);
        retryAttempt++;
      } else if (remainingPosts.length > 0) {
        console.log(`   ⚠️  Max retry attempts (${maxRetryAttempts}) reached. ${remainingPosts.length} posts still failed.`);
        // Add remaining posts to failed requests
        remainingPosts.forEach(post => this.failedRequests.push(post));
        failed += remainingPosts.length;
        break;
      } else {
        console.log(`   ✅ Retry attempt ${retryAttempt} successful - all posts processed!`);
        break;
      }
    }

    return { successful, failed, videosFound };
  }

  /**
   * Save URLs to file in key-value format
   */
  saveUrlsToFile(urlsMap: Map<string, string[]>, filename: string): void {
    const lines: string[] = [];
    
    for (const [title, urls] of urlsMap) {
      if (urls.length > 0) {
        // Escape any newlines in the title
        const escapedTitle = title.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        lines.push(`# ${escapedTitle}`);
        urls.forEach(url => lines.push(url));
        lines.push(''); // Empty line between entries
      }
    }
    
    writeFileSync(filename, lines.join('\n'), 'utf8');
    console.log(`💾 Saved ${urlsMap.size} posts with video URLs to ${filename}`);
  }

  /**
   * Save failed requests to file in key-value format
   */
  saveFailedRequests(filename: string = 'failed-extraction-requests.txt'): void {
    if (this.failedRequests.length > 0) {
      const lines: string[] = [];
      
      for (const post of this.failedRequests) {
        const escapedTitle = post.title.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        lines.push(`# ${escapedTitle} (r/${post.subreddit})`);
        lines.push(post.url);
        lines.push(''); // Empty line between entries
      }
      
      writeFileSync(filename, lines.join('\n'), 'utf8');
      console.log(`💾 Saved ${this.failedRequests.length} failed requests to ${filename}`);
    } else {
      console.log(`📝 No failed requests to save`);
    }
  }

  /**
   * Retry failed requests from file
   */
  async retryFailedRequests(filename: string = 'failed-extraction-requests.txt'): Promise<string[]> {
    if (!existsSync(filename)) {
      console.log(`❌ No failed requests file found: ${filename}`);
      return [];
    }

    console.log(`🔄 Retrying failed requests from ${filename}...\n`);

    const content = readFileSync(filename, 'utf8');
    const failedUrls = content.split('\n').filter(url => url.trim());

    console.log(`📊 Found ${failedUrls.length} failed URLs to retry\n`);

    // Convert URLs to posts
    const failedPosts: RedditPost[] = failedUrls.map(url => ({
      url: url.trim(),
      title: 'Retry',
      subreddit: 'Unknown',
      author: 'Unknown'
    }));

    // Retry failed posts with 429 handling
    const retryResults = await this.retryFailedPostsWith429Handling(failedPosts);

    console.log('\n📊 Retry Summary:');
    console.log(`   Total retried: ${failedUrls.length}`);
    console.log(`   Retry successful: ${retryResults.successful}`);
    console.log(`   Retry failed: ${retryResults.failed}`);

    // Return all URLs as a flat array for compatibility
    const allUrls: string[] = [];
    for (const urls of this.extractedUrls.values()) {
      allUrls.push(...urls);
    }
    return allUrls;
  }
}

/**
 * Main function
 */
async function main() {
  const extractor = new VideoUrlExtractor();
  
  try {
    const videoUrls = await extractor.extractAllVideoUrls();
    
    if (videoUrls.length > 0) {
      console.log('\n✅ Video URL extraction complete!');
    } else {
      console.log('\nℹ️  No video URLs found in the saved posts.');
    }
  } catch (error) {
    console.error('❌ Error during extraction:', error);
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
  }
  
  export { VideoUrlExtractor, main }; 