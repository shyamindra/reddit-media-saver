import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

interface MediaEntry {
  title: string;
  url: string;
  type: 'image' | 'gif' | 'text';
}

interface DownloadResult {
  url: string;
  title: string;
  type: string;
  success: boolean;
  filePath?: string;
  error?: string;
}

class MediaDownloader {
  private outputDir = 'downloads/Media';
  private usedTitles = new Set<string>();

  constructor() {
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
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
   * Sanitize filename to be filesystem-safe
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .substring(0, 200); // Limit length
  }

  /**
   * Generate unique filename for a title
   */
  private generateUniqueFilename(title: string, type: string, extension: string): string {
    const sanitizedTitle = this.sanitizeFilename(title);
    let filename = `${sanitizedTitle}${extension}`;
    let counter = 1;

    while (this.usedTitles.has(filename)) {
      filename = `${sanitizedTitle} (${counter})${extension}`;
      counter++;
    }

    this.usedTitles.add(filename);
    return filename;
  }

  /**
   * Download a single media item
   */
  private async downloadMediaItem(entry: MediaEntry): Promise<DownloadResult> {
    return new Promise(async (resolve) => {
      const { title, url, type } = entry;
      const extension = this.getExtension(url, type);
      const filename = this.generateUniqueFilename(title, type, extension);
      const filePath = join(this.outputDir, filename);
      
      console.log(`📥 Downloading: ${title} (${type})`);
      console.log(`   📁 Filename: ${filename}`);
      console.log(`   🔗 URL: ${url}`);
      
      try {
        // Add delay for rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (type === 'text') {
          // For text content, save the URL and metadata
          const content = `Title: ${title}\nURL: ${url}\nType: ${type}\n\n`;
          writeFileSync(filePath, content, 'utf8');
        } else {
          // For images and GIFs, download the file
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'RedditSaverApp/1.0.0' },
            timeout: 30000
          });
          
          writeFileSync(filePath, response.data);
        }
        
        resolve({
          url,
          title,
          type,
          success: true,
          filePath: filePath
        });
        
      } catch (error) {
        console.error(`❌ Download failed for ${title}:`, error);
        resolve({
          url,
          title,
          type,
          success: false,
          error: error instanceof Error ? error.message : 'Download failed'
        });
      }
    });
  }

  /**
   * Download all media items
   */
  async downloadMedia(entries: MediaEntry[]): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: DownloadResult[];
  }> {
    const results: DownloadResult[] = [];
    let successful = 0;
    let failed = 0;
    
    console.log(`🚀 Starting download of ${entries.length} media items`);
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      console.log(`\n📥 Downloading ${i + 1}/${entries.length}: ${entry.title}`);
      
      const result = await this.downloadMediaItem(entry);
      results.push(result);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
      
      // Rate limiting: pause after every 50 downloads
      if ((i + 1) % 50 === 0) {
        console.log(`⏸️  Pausing for 3 minutes after batch ${Math.floor((i + 1) / 50)}`);
        await new Promise(resolve => setTimeout(resolve, 180000)); // 3 minutes
      }
    }
    
    // Save results
    this.saveFailedEntries(results);
    
    return {
      total: entries.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Load entries from the extracted media URLs file
   */
  loadEntriesFromFile(filePath: string = 'extracted_files/all-extracted-media-urls.txt'): MediaEntry[] {
    if (!existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return [];
    }
    
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const entries: MediaEntry[] = [];
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
    
    console.log(`📝 Loaded ${entries.length} media entries from ${filePath}`);
    return entries;
  }

  /**
   * Save failed download entries
   */
  saveFailedEntries(results: DownloadResult[], filename: string = 'extracted_files/failed_requests/failed-media-downloads.txt'): void {
    const failed = results.filter(r => !r.success);
    
    if (failed.length === 0) {
      console.log('✅ No failed downloads to save');
      return;
    }
    
    let content = '';
    for (const result of failed) {
      content += `# ${result.title}\n${result.url}\nError: ${result.error}\n\n`;
    }
    
    writeFileSync(filename, content, 'utf8');
    console.log(`📝 Saved ${failed.length} failed downloads to ${filename}`);
  }

  /**
   * Create mapping from original file to deduplicated URLs
   */
  createDeduplicatedMapping(
    originalFile: string = 'extracted_files/all-extracted-media-urls.txt',
    deduplicatedFile: string = 'extracted_files/deduplicated-media-urls.txt'
  ): MediaEntry[] {
    if (!existsSync(originalFile)) {
      console.log(`❌ Original file not found: ${originalFile}`);
      return [];
    }
    
    if (!existsSync(deduplicatedFile)) {
      console.log(`❌ Deduplicated file not found: ${deduplicatedFile}`);
      return [];
    }
    
    // Load original file to get title mappings
    const originalContent = readFileSync(originalFile, 'utf8');
    const originalLines = originalContent.split('\n').filter(line => line.trim());
    
    const titleToUrls = new Map<string, string[]>();
    let currentTitle = '';
    
    for (const line of originalLines) {
      if (line.startsWith('# ')) {
        currentTitle = line.substring(2).trim();
        titleToUrls.set(currentTitle, []);
      } else if (line.startsWith('http') && currentTitle) {
        const urls = titleToUrls.get(currentTitle) || [];
        urls.push(line.trim());
        titleToUrls.set(currentTitle, urls);
      }
    }
    
    // Load deduplicated URLs
    const deduplicatedContent = readFileSync(deduplicatedFile, 'utf8');
    const deduplicatedUrls = deduplicatedContent.split('\n').filter(line => line.trim() && line.startsWith('http'));
    
    // Create mapping
    const entries: MediaEntry[] = [];
    
    for (const url of deduplicatedUrls) {
      // Find which title this URL belongs to
      for (const [title, urls] of titleToUrls) {
        if (urls.includes(url)) {
          const type = this.detectMediaType(url);
          entries.push({
            title: title,
            url: url,
            type: type
          });
          break;
        }
      }
    }
    
    console.log(`📝 Created mapping for ${entries.length} deduplicated media entries`);
    return entries;
  }
}

async function main() {
  const downloader = new MediaDownloader();
  
  try {
    // Load entries from the extracted media URLs file
    const entries = downloader.loadEntriesFromFile();
    
    if (entries.length === 0) {
      console.log('❌ No media entries found to download');
      return;
    }
    
    // Download all media items
    const result = await downloader.downloadMedia(entries);
    
    console.log('\n🎉 Media download completed!');
    console.log(`📊 Total items: ${result.total}`);
    console.log(`✅ Successful: ${result.successful}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`📁 Files saved to: downloads/Media/`);
    
  } catch (error) {
    console.error('❌ Error during download:', error);
  }
}

// Run the main function
main(); 