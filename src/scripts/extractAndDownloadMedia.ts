import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

interface RedditPost {
  url: string;
  title: string;
  subreddit: string;
  author: string;
}

interface MediaItem {
  title: string;
  url: string;
  type: 'image' | 'gif' | 'text';
  extension?: string;
}

interface DownloadResult {
  url: string;
  title: string;
  type: string;
  success: boolean;
  filePath?: string;
  error?: string;
}

class MediaExtractorAndDownloader {
  private userAgent = 'RedditSaverApp/1.0.0 (by /u/reddit_user)';
  private extractedItems: MediaItem[] = [];
  private failedRequests: RedditPost[] = [];
  private videoUrls: Set<string> = new Set();
  private outputDir = 'downloads/Media';

  constructor() {
    this.ensureOutputDirectory();
    this.loadVideoUrls();
  }

  private ensureOutputDirectory(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Load video URLs to exclude them from processing
   */
  private loadVideoUrls(): void {
    const videoFile = 'extracted_files/all-extracted-video-urls.txt';
    if (existsSync(videoFile)) {
      const content = readFileSync(videoFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      lines.forEach(url => this.videoUrls.add(url.trim()));
      console.log(`📹 Loaded ${this.videoUrls.size} video URLs to exclude`);
    }
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
                continue;
              }
            }

            if (url && title) {
              posts.push({ url, title, subreddit, author });
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error reading ${file}:`, error);
      }
    }

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
   * Get file extension from URL
   */
  private getExtension(url: string, type: string): string {
    if (type === 'text') return '.txt';
    
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.gif')) return '.gif';
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return '.jpg';
    if (urlLower.includes('.png')) return '.png';
    if (urlLower.includes('.webp')) return '.webp';
    
    // Default extensions
    if (type === 'gif') return '.gif';
    if (type === 'image') return '.jpg';
    
    return '.txt';
  }

  /**
   * Extract media URLs from a Reddit post
   */
  private async extractMediaFromPost(post: RedditPost): Promise<MediaItem[]> {
    const items: MediaItem[] = [];
    
    try {
      // Add delay for rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await axios.get(post.url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const html = response.data;
      
      // Extract URLs from the HTML
      const urlMatches = html.match(/https?:\/\/[^\s"']+/g) || [];
      
      for (const url of urlMatches) {
        // Skip video URLs
        if (this.isVideoUrl(url)) {
          continue;
        }
        
        const type = this.detectMediaType(url);
        const extension = this.getExtension(url, type);
        
        items.push({
          title: post.title,
          url: url,
          type: type,
          extension: extension
        });
      }
      
      console.log(`✅ Extracted ${items.length} media items from: ${post.title}`);
      
    } catch (error) {
      console.error(`❌ Failed to extract from ${post.title}:`, error);
      this.failedRequests.push(post);
    }
    
    return items;
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  /**
   * Generate unique filename
   */
  private generateUniqueFilename(title: string, type: string, extension: string): string {
    const sanitizedTitle = this.sanitizeFilename(title);
    const baseFilename = `${sanitizedTitle}${extension}`;
    
    if (!existsSync(join(this.outputDir, baseFilename))) {
      return baseFilename;
    }
    
    let counter = 1;
    let filename = `${sanitizedTitle} (${counter})${extension}`;
    
    while (existsSync(join(this.outputDir, filename))) {
      counter++;
      filename = `${sanitizedTitle} (${counter})${extension}`;
    }
    
    return filename;
  }

  /**
   * Download a single media item
   */
  private async downloadMediaItem(item: MediaItem): Promise<DownloadResult> {
    try {
      // Add delay for rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const filename = this.generateUniqueFilename(item.title, item.type, item.extension || '');
      const filePath = join(this.outputDir, filename);
      
      console.log(`📥 Downloading: ${item.title} (${item.type})`);
      
      if (item.type === 'text') {
        // For text, we'll save the URL as content
        const content = `Title: ${item.title}\nURL: ${item.url}\nType: ${item.type}\n\n`;
        writeFileSync(filePath, content, 'utf8');
      } else {
        // For images and GIFs, download the file
        const response = await axios.get(item.url, {
          responseType: 'arraybuffer',
          headers: { 'User-Agent': this.userAgent },
          timeout: 30000
        });
        
        writeFileSync(filePath, response.data);
      }
      
      return {
        url: item.url,
        title: item.title,
        type: item.type,
        success: true,
        filePath: filePath
      };
      
    } catch (error) {
      return {
        url: item.url,
        title: item.title,
        type: item.type,
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Process all posts and extract media
   */
  async extractAndDownloadMedia(): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: DownloadResult[];
  }> {
    const posts = this.readCsvFiles();
    const results: DownloadResult[] = [];
    let successful = 0;
    let failed = 0;
    
    console.log(`🚀 Starting media extraction and download for ${posts.length} posts`);
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`\n📝 Processing ${i + 1}/${posts.length}: ${post.title}`);
      
      // Extract media items from post
      const items = await this.extractMediaFromPost(post);
      
      // Download each media item
      for (const item of items) {
        const result = await this.downloadMediaItem(item);
        results.push(result);
        
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      }
      
      // Rate limiting: pause after every 50 requests
      if ((i + 1) % 50 === 0) {
        console.log(`⏸️  Pausing for 3 minutes after batch ${Math.floor((i + 1) / 50)}`);
        await new Promise(resolve => setTimeout(resolve, 180000)); // 3 minutes
      }
    }
    
    // Save results
    this.saveResults(results);
    this.saveFailedRequests();
    
    return {
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Save download results
   */
  private saveResults(results: DownloadResult[]): void {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    // Save successful downloads
    const successfulContent = successful.map(r => 
      `# ${r.title}\n${r.url}\n`
    ).join('\n');
    writeFileSync('successful-media-downloads.txt', successfulContent, 'utf8');
    
    // Save failed downloads
    const failedContent = failed.map(r => 
      `# ${r.title}\n${r.url}\nError: ${r.error}\n`
    ).join('\n');
    writeFileSync('failed-media-downloads.txt', failedContent, 'utf8');
    
    console.log(`\n📊 Results saved:`);
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
  }

  /**
   * Save failed requests
   */
  private saveFailedRequests(): void {
    if (this.failedRequests.length === 0) return;
    
    const content = this.failedRequests.map(post => 
      `# ${post.title}\n${post.url}\n`
    ).join('\n');
    
    writeFileSync('failed-media-extraction-requests.txt', content, 'utf8');
    console.log(`📝 Saved ${this.failedRequests.length} failed extraction requests`);
  }
}

async function main() {
  const extractor = new MediaExtractorAndDownloader();
  
  try {
    const result = await extractor.extractAndDownloadMedia();
    
    console.log('\n🎉 Media extraction and download completed!');
    console.log(`📊 Total items processed: ${result.total}`);
    console.log(`✅ Successful downloads: ${result.successful}`);
    console.log(`❌ Failed downloads: ${result.failed}`);
    console.log(`📁 Files saved to: downloads/Media/`);
    
  } catch (error) {
    console.error('❌ Error during extraction:', error);
  }
}

// Run the main function
main(); 