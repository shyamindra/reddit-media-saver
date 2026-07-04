import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import extractionConfig from '../config/extraction.config';
import { FileInputService } from '../services/fileInputService';

interface RedditPost {
  url: string;
  title: string;
  subreddit: string;
  author: string;
}

interface ExtractionResult {
  success: boolean;
  post: RedditPost;
  mediaUrls: string[];
  error?: string;
}

class MediaUrlExtractor {
  private config = extractionConfig;
  private extractedUrls: Map<string, string[]> = new Map(); // title -> URLs
  private failedRequests: RedditPost[] = [];
  private videoUrls: Set<string> = new Set();
  private processedCount = 0;

  constructor() {
    this.loadVideoUrls();
  }

  /**
   * Load video URLs to exclude them from processing
   */
  private loadVideoUrls(): void {
    const videoFile = this.config.files.videoUrls.all;
    if (existsSync(videoFile)) {
      const content = readFileSync(videoFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      lines.forEach(url => this.videoUrls.add(url.trim()));
      console.log(`📹 Loaded ${this.videoUrls.size} video URLs to exclude`);
    }
  }

  /**
   * Clear existing files and start fresh
   */
  private clearExistingFiles(): void {
    const filesToClear = [
      this.config.files.mediaUrls.all,
      this.config.files.mediaUrls.failedExtraction
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

  private readCsvFiles(): RedditPost[] {
    const posts = FileInputService.readRedditPostsFromCsv(this.config.files.redditLinksDir);
    console.log(`📊 Total posts found: ${posts.length}`);
    return posts;
  }

  /**
   * Check if URL is a video (to exclude)
   */
  private isVideoUrl(url: string): boolean {
    return this.videoUrls.has(url) || 
           url.includes('v.redd.it') || 
           url.includes('redgifs.com') ||
           url.includes('.mp4') ||
           url.includes('.webm') ||
           url.includes('.mov');
  }

  /**
   * Check if URL is a media URL (image, gif, or text)
   */
  private isMediaUrl(url: string): boolean {
    // Skip video URLs
    if (this.isVideoUrl(url)) {
      return false;
    }
    
    // Check for image URLs
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || 
        url.includes('.webp') || url.includes('.gif') || 
        url.includes('i.redd.it') || url.includes('i.imgur.com') ||
        url.includes('gfycat.com')) {
      return true;
    }
    
    // Check for text content (Reddit posts, comments, etc.)
    if (url.includes('reddit.com') && !url.includes('v.redd.it')) {
      return true;
    }
    
    return false;
  }

  /**
   * Extract media URLs from a Reddit post
   */
  private async extractMediaUrlsFromPost(post: RedditPost): Promise<ExtractionResult> {
    try {
      // Validate URL
      if (!post.url || !post.url.startsWith('http')) {
        return {
          success: false,
          post,
          mediaUrls: [],
          error: 'Invalid URL'
        };
      }

      // Add delay for rate limiting
      await new Promise(resolve => setTimeout(resolve, this.config.timing.delayBetweenRequests));
      
      const response = await axios.get(post.url, {
        headers: { 'User-Agent': this.config.userAgent },
        timeout: 30000
      });

      const html = response.data;
      const mediaUrls: string[] = [];
      
      // Extract URLs from the HTML
      const urlMatches = html.match(/https?:\/\/[^\s"']+/g) || [];
      
      for (const url of urlMatches) {
        if (this.isMediaUrl(url)) {
          mediaUrls.push(url);
        }
      }
      
      // Remove duplicates
      const uniqueUrls = [...new Set(mediaUrls)];
      
      console.log(`✅ Extracted ${uniqueUrls.length} media URLs from: ${post.title}`);
      
      return {
        success: true,
        post,
        mediaUrls: uniqueUrls
      };
      
    } catch (error) {
      console.error(`❌ Failed to extract from ${post.title}:`, error);
      this.failedRequests.push(post);
      
      return {
        success: false,
        post,
        mediaUrls: [],
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }

  /**
   * Extract media URLs from all posts
   */
  async extractAllMediaUrls(): Promise<string[]> {
    this.clearExistingFiles();
    
    const posts = this.readCsvFiles();
    const allUrls: string[] = [];
    
    console.log(`🚀 Starting media URL extraction for ${posts.length} posts`);
    console.log(`⚙️  Using config: ${this.config.batch.size} batch size, ${this.config.timing.delayBetweenRequests}ms delay, ${this.config.timing.delayBetweenBatches}ms batch delay`);
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`\n📝 Processing ${i + 1}/${posts.length}: ${post.title}`);
      
      const result = await this.extractMediaUrlsFromPost(post);
      
      if (result.success && result.mediaUrls.length > 0) {
        this.extractedUrls.set(post.title, result.mediaUrls);
        allUrls.push(...result.mediaUrls);
        
        // Save incrementally every N iterations
        if ((i + 1) % this.config.batch.saveInterval === 0) {
          this.saveUrlsIncrementally(post.title, result.mediaUrls);
          console.log(`💾 Saved progress: ${i + 1}/${posts.length} posts processed`);
        }
      } else if (!result.success) {
        this.failedRequests.push(post);
        this.saveFailedRequestIncrementally(post);
      }
      
      // Rate limiting: pause after every batch
      if ((i + 1) % this.config.batch.size === 0) {
        console.log(`⏸️  Pausing for ${this.config.timing.delayBetweenBatches / 1000} seconds after batch ${Math.floor((i + 1) / this.config.batch.size)}`);
        await new Promise(resolve => setTimeout(resolve, this.config.timing.delayBetweenBatches));
      } else {
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, this.config.timing.delayBetweenRequests));
      }
    }
    
    // Final save of all results
    this.saveUrlsToFile(this.extractedUrls, this.config.files.mediaUrls.all);
    this.saveFailedRequests();
    
    console.log(`\n📊 Extraction completed:`);
    console.log(`✅ Posts with media: ${this.extractedUrls.size}`);
    console.log(`📹 Total media URLs: ${allUrls.length}`);
    console.log(`❌ Failed requests: ${this.failedRequests.length}`);
    
    return allUrls;
  }

  /**
   * Save URLs to file in key-value format
   */
  saveUrlsToFile(urlsMap: Map<string, string[]>, filename: string): void {
    let content = '';
    
    for (const [title, urls] of urlsMap) {
      if (urls.length > 0) {
        content += `# ${title}\n`;
        urls.forEach(url => {
          content += `${url}\n`;
        });
        content += '\n';
      }
    }
    
    writeFileSync(filename, content, 'utf8');
    console.log(`💾 Saved ${urlsMap.size} posts with media URLs to ${filename}`);
  }

  /**
   * Save URLs incrementally to file
   */
  private saveUrlsIncrementally(title: string, urls: string[]): void {
    if (urls.length === 0) return;
    
    const filename = this.config.files.mediaUrls.all;
    const escapedTitle = title.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    
    let content = `# ${escapedTitle}\n`;
    urls.forEach(url => content += `${url}\n`);
    content += '\n'; // Empty line between entries
    
    appendFileSync(filename, content, 'utf8');
  }

  /**
   * Save failed request incrementally
   */
  private saveFailedRequestIncrementally(post: RedditPost): void {
    const filename = this.config.files.mediaUrls.failedExtraction;
    const escapedTitle = post.title.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    
    const content = `# ${escapedTitle}\n${post.url}\n\n`;
    appendFileSync(filename, content, 'utf8');
  }

  /**
   * Save failed requests
   */
  saveFailedRequests(filename: string = this.config.files.mediaUrls.failedExtraction): void {
    if (this.failedRequests.length === 0) {
      console.log('✅ No failed requests to save');
      return;
    }
    
    // Ensure the failed_requests directory exists
    const failedRequestsDir = this.config.files.failedRequestsDir;
    if (!existsSync(failedRequestsDir)) {
      mkdirSync(failedRequestsDir, { recursive: true });
    }
    
    let content = '';
    for (const post of this.failedRequests) {
      content += `# ${post.title}\n${post.url}\n\n`;
    }
    
    writeFileSync(filename, content, 'utf8');
    console.log(`📝 Saved ${this.failedRequests.length} failed requests to ${filename}`);
  }

  /**
   * Retry failed requests with 429 handling
   */
  async retryFailedPostsWith429Handling(failedPosts: RedditPost[]): Promise<{
    successful: number;
    failed: number;
    mediaFound: number;
  }> {
    if (failedPosts.length === 0) {
      console.log('✅ No failed posts to retry');
      return { successful: 0, failed: 0, mediaFound: 0 };
    }
    
    console.log(`🔄 Retrying ${failedPosts.length} failed posts...`);
    
    let successful = 0;
    let failed = 0;
    let mediaFound = 0;
    
    for (let i = 0; i < failedPosts.length; i++) {
      const post = failedPosts[i];
      console.log(`\n🔄 Retrying ${i + 1}/${failedPosts.length}: ${post.title}`);
      
      try {
        // Longer delay for retries
        await new Promise(resolve => setTimeout(resolve, this.config.timing.retryDelay));
        
        const result = await this.extractMediaUrlsFromPost(post);
        
        if (result.success) {
          successful++;
          if (result.mediaUrls.length > 0) {
            this.extractedUrls.set(post.title, result.mediaUrls);
            mediaFound += result.mediaUrls.length;
          }
        } else {
          failed++;
        }
        
        // Rate limiting: pause after every 25 retries
        if ((i + 1) % 25 === 0) {
          console.log(`⏸️  Pausing for ${this.config.timing.retryDelay / 1000} seconds after retry batch ${Math.floor((i + 1) / 25)}`);
          await new Promise(resolve => setTimeout(resolve, this.config.timing.retryDelay));
        }
        
      } catch (error) {
        failed++;
        console.error(`❌ Retry failed for ${post.title}:`, error);
      }
    }
    
    // Update the main results file
    this.saveUrlsToFile(this.extractedUrls, this.config.files.mediaUrls.all);
    
    console.log(`\n📊 Retry completed:`);
    console.log(`✅ Successful retries: ${successful}`);
    console.log(`❌ Failed retries: ${failed}`);
    console.log(`📹 Additional media URLs found: ${mediaFound}`);
    
    return { successful, failed, mediaFound };
  }

  /**
   * Retry failed requests from file
   */
  async retryFailedRequests(filename: string = this.config.files.mediaUrls.failedExtraction): Promise<string[]> {
    if (!existsSync(filename)) {
      console.log(`❌ File not found: ${filename}`);
      return [];
    }
    
    const content = readFileSync(filename, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const failedPosts: RedditPost[] = [];
    let currentPost: Partial<RedditPost> = {};
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        // Save previous post if exists
        if (currentPost.title && currentPost.url) {
          failedPosts.push(currentPost as RedditPost);
        }
        
        // Start new post
        currentPost = {
          title: line.substring(2),
          url: '',
          subreddit: 'Unknown',
          author: 'Unknown'
        };
      } else if (line.startsWith('http') && currentPost.title) {
        currentPost.url = line;
      }
    }
    
    // Add last post
    if (currentPost.title && currentPost.url) {
      failedPosts.push(currentPost as RedditPost);
    }
    
    console.log(`📝 Loaded ${failedPosts.length} failed posts from ${filename}`);
    
    const result = await this.retryFailedPostsWith429Handling(failedPosts);
    
    // Return all URLs found
    const allUrls: string[] = [];
    for (const urls of this.extractedUrls.values()) {
      allUrls.push(...urls);
    }
    
    return allUrls;
  }
}

async function main() {
  const extractor = new MediaUrlExtractor();
  
  try {
    const urls = await extractor.extractAllMediaUrls();
    
    console.log('\n🎉 Media URL extraction completed!');
    console.log(`📊 Total media URLs found: ${urls.length}`);
    console.log(`📁 Results saved to: ${extractionConfig.files.mediaUrls.all}`);
    
  } catch (error) {
    console.error('❌ Error during extraction:', error);
  }
}

// Run the main function
main(); 