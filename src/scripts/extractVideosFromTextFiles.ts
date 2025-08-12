import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

/**
 * Script to extract video URLs from text files and download the actual videos
 * This processes HTML content that was saved as text files
 */
class VideoExtractorFromTextFiles {
  private notesDir = 'downloads/Notes';
  private videosDir = 'downloads/Videos';
  private userAgent = 'RedditSaverApp/1.0.0 (by /u/reddit_user)';

  /**
   * Extract video URLs from HTML content (copied from contentDownloadService)
   */
  private extractVideoUrlsFromHtml(htmlContent: string): string[] {
    const urls: string[] = [];
    
    // Decode HTML entities first
    const decodedContent = htmlContent
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    // Extract RedGIFs video URLs from meta tags
    const redgifsMatch = decodedContent.match(/<meta property="og:video" content="([^"]+)"/);
    if (redgifsMatch) {
      urls.push(redgifsMatch[1]);
    }
    
    // Extract RedGIFs video URLs from JSON-LD
    const jsonLdMatch = decodedContent.match(/"contentUrl":"([^"]+\.mp4)"/);
    if (jsonLdMatch) {
      urls.push(jsonLdMatch[1]);
    }
    
    // Extract RedGIFs URLs from various patterns
    const redgifsPatterns = [
      /https:\/\/media\.redgifs\.com\/[a-zA-Z0-9_-]+\.mp4/g,
      /https:\/\/media\.redgifs\.com\/[a-zA-Z0-9_-]+-silent\.mp4/g
    ];
    
    redgifsPatterns.forEach(pattern => {
      const matches = decodedContent.match(pattern);
      if (matches) {
        urls.push(...matches);
      }
    });
    
    // Extract v.redd.it video URLs (clean ones)
    const vredditMatches = decodedContent.match(/https:\/\/v\.redd\.it\/[a-zA-Z0-9]+/g);
    if (vredditMatches) {
      urls.push(...vredditMatches);
    }
    
    // Extract DASH audio URLs
    const dashMatches = decodedContent.match(/https:\/\/v\.redd\.it\/[a-zA-Z0-9]+\/DASH_96\.mp4/g);
    if (dashMatches) {
      urls.push(...dashMatches);
    }
    
    // Extract packaged-media URLs (clean ones)
    const packagedMatches = decodedContent.match(/https:\/\/packaged-media\.redd\.it\/[a-zA-Z0-9]+\/pb\/m2-res_[0-9]+p\.mp4\?[^"'\s]+/g);
    if (packagedMatches) {
      // Clean up the URLs by removing extra content
      const cleanPackaged = packagedMatches.map(url => {
        const cleanUrl = url.split('&quot;')[0]; // Remove everything after &quot;
        return cleanUrl;
      });
      urls.push(...cleanPackaged);
    }
    
    // Extract any other video URLs
    const videoMatches = decodedContent.match(/https:\/\/[^"'\s]+\.(mp4|webm|mov|avi|mkv)/g);
    if (videoMatches) {
      urls.push(...videoMatches);
    }
    
    return [...new Set(urls)]; // Remove duplicates
  }

  /**
   * Check if content is HTML
   */
  private isHtmlContent(content: string): boolean {
    const sample = content.slice(0, 1024).toLowerCase();
    return sample.includes('<!doctype html') || 
           sample.includes('<html') || 
           sample.includes('<head') || 
           sample.includes('<body') ||
           sample.includes('<!DOCTYPE') ||
           sample.includes('<title>') || 
           sample.includes('<meta') || 
           sample.includes('<script') || 
           sample.includes('<style>');
  }

  /**
   * Download a video file
   */
  private async downloadVideo(url: string, filename: string): Promise<boolean> {
    try {
      console.log(`📥 Downloading: ${url}`);
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { 
          'User-Agent': this.userAgent,
          'Accept': 'video/*,*/*',
          'Accept-Encoding': 'gzip, deflate',
          'Referer': 'https://www.reddit.com/',
          'Origin': 'https://www.reddit.com'
        },
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      const outputPath = join(this.videosDir, filename);
      writeFileSync(outputPath, response.data);
      
      const fileSize = (response.data.length / 1024 / 1024).toFixed(2);
      console.log(`✅ Downloaded: ${filename} (${fileSize} MB)`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to download ${url}: ${error}`);
      return false;
    }
  }

  /**
   * Generate filename for video
   */
  private generateVideoFilename(url: string, index: number): string {
    if (url.includes('redgifs.com')) {
      const match = url.match(/https:\/\/media\.redgifs\.com\/([^\/]+)/);
      if (match) {
        let filename = match[1];
        if (filename.endsWith('.mp4')) {
          filename = filename.slice(0, -4);
        }
        return `${filename}.mp4`;
      }
    }
    
    if (url.includes('v.redd.it')) {
      const match = url.match(/https:\/\/v\.redd\.it\/([a-zA-Z0-9]+)/);
      if (match) {
        return `reddit_${match[1]}.mp4`;
      }
    }
    
    if (url.includes('packaged-media.redd.it')) {
      const match = url.match(/https:\/\/packaged-media\.redd\.it\/([a-zA-Z0-9]+)\/pb\/m2-res_([0-9]+)p\.mp4/);
      if (match) {
        return `reddit_packaged_${match[1]}_${match[2]}p.mp4`;
      }
    }
    
    // Fallback
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.split('/').pop() || 'video';
    return `extracted_${index}_${pathname}`;
  }

  /**
   * Process a single text file
   */
  private async processTextFile(filePath: string): Promise<{ file: string; urlsFound: number; downloaded: number }> {
    const fileName = filePath.split('/').pop() || '';
    console.log(`\n📄 Processing: ${fileName}`);
    
    try {
      const content = readFileSync(filePath, 'utf8');
      
      if (!this.isHtmlContent(content)) {
        console.log(`   ⏭️  Not HTML content, skipping`);
        return { file: fileName, urlsFound: 0, downloaded: 0 };
      }
      
      const videoUrls = this.extractVideoUrlsFromHtml(content);
      
      if (videoUrls.length === 0) {
        console.log(`   ❌ No video URLs found`);
        return { file: fileName, urlsFound: 0, downloaded: 0 };
      }
      
      console.log(`   🎬 Found ${videoUrls.length} video URL(s)`);
      
      let downloaded = 0;
      for (let i = 0; i < videoUrls.length; i++) {
        const url = videoUrls[i];
        const filename = this.generateVideoFilename(url, i);
        
        console.log(`   📥 [${i + 1}/${videoUrls.length}] ${url}`);
        if (await this.downloadVideo(url, filename)) {
          downloaded++;
        }
      }
      
      return { file: fileName, urlsFound: videoUrls.length, downloaded };
    } catch (error) {
      console.error(`   ❌ Error processing ${fileName}: ${error}`);
      return { file: fileName, urlsFound: 0, downloaded: 0 };
    }
  }

  /**
   * Run the extractor
   */
  public async run(): Promise<void> {
    console.log('🔍 Starting video extraction from text files...');
    console.log(`📁 Scanning directory: ${this.notesDir}`);
    
    try {
      const files = readdirSync(this.notesDir);
      const textFiles = files.filter(file => file.endsWith('.txt'));
      
      if (textFiles.length === 0) {
        console.log('✅ No text files found in Notes directory');
        return;
      }
      
      console.log(`📋 Found ${textFiles.length} text file(s) to process`);
      
      let totalUrlsFound = 0;
      let totalDownloaded = 0;
      let processedFiles = 0;
      
      for (const file of textFiles) {
        const filePath = join(this.notesDir, file);
        const result = await this.processTextFile(filePath);
        
        totalUrlsFound += result.urlsFound;
        totalDownloaded += result.downloaded;
        if (result.urlsFound > 0) {
          processedFiles++;
        }
      }
      
      console.log(`\n📊 Summary:`);
      console.log(`   📄 Files processed: ${processedFiles}/${textFiles.length}`);
      console.log(`   🎬 Video URLs found: ${totalUrlsFound}`);
      console.log(`   ✅ Videos downloaded: ${totalDownloaded}`);
      console.log(`   📁 Videos saved to: ${this.videosDir}`);
      
    } catch (error) {
      console.error(`❌ Error reading Notes directory: ${error}`);
    }
  }
}

// Run the extractor if this script is executed directly
if (require.main === module) {
  const extractor = new VideoExtractorFromTextFiles();
  extractor.run().catch(console.error);
}

export { VideoExtractorFromTextFiles }; 