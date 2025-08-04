import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface DownloadResult {
  url: string;
  title: string;
  success: boolean;
  filePath?: string;
  error?: string;
}

interface VideoEntry {
  title: string;
  url: string;
}

class YtdlpDownloader {
  private outputDir = 'downloads/Videos';
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
  private generateUniqueFilename(title: string): string {
    const sanitizedTitle = this.sanitizeFilename(title);
    let filename = sanitizedTitle;
    let counter = 1;

    while (this.usedTitles.has(filename)) {
      filename = `${sanitizedTitle} (${counter})`;
      counter++;
    }

    this.usedTitles.add(filename);
    return filename;
  }

  /**
   * Download a single video using yt-dlp with custom filename
   */
  private async downloadVideo(entry: VideoEntry): Promise<DownloadResult> {
    return new Promise((resolve) => {
      const { title, url } = entry;
      const filename = this.generateUniqueFilename(title);
      
      console.log(`🎬 Downloading: ${title}`);
      console.log(`   📁 Filename: ${filename}`);
      console.log(`   🔗 URL: ${url}`);
      
      // yt-dlp command with custom filename
      const args = [
        '-f', 'best', // Best quality
        '-o', join(this.outputDir, `${filename}.%(ext)s`),
        '--no-playlist',
        '--no-warnings',
        url
      ];

      const ytdlp = spawn('yt-dlp', args);
      
      let stdout = '';
      let stderr = '';

      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(data.toString().trim());
      });

      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(data.toString().trim());
      });

      ytdlp.on('close', (code) => {
        if (code === 0) {
          // Extract filename from output
          const match = stdout.match(/Destination: (.+)/);
          const filePath = match ? match[1] : undefined;
          
          console.log(`✅ Success: ${title}`);
          resolve({
            url,
            title,
            success: true,
            filePath
          });
        } else {
          console.log(`❌ Failed: ${title}`);
          resolve({
            url,
            title,
            success: false,
            error: stderr || `Exit code: ${code}`
          });
        }
      });

      ytdlp.on('error', (error) => {
        console.log(`❌ Error: ${title} - ${error.message}`);
        resolve({
          url,
          title,
          success: false,
          error: error.message
        });
      });
    });
  }

  /**
   * Download videos from a list of entries
   */
  async downloadVideos(entries: VideoEntry[]): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: DownloadResult[];
  }> {
    console.log(`🚀 Starting download of ${entries.length} videos...\n`);

    const results: DownloadResult[] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      console.log(`[${i + 1}/${entries.length}] Processing: ${entry.title}`);
      
      const result = await this.downloadVideo(entry);
      results.push(result);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Small delay between downloads
      if (i < entries.length - 1) {
        console.log('⏱️  Waiting 2 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return {
      total: entries.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Load URLs from key-value format file (all-extracted-video-urls.txt)
   */
  loadEntriesFromFile(filePath: string = 'all-extracted-video-urls.txt'): VideoEntry[] {
    if (!existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return [];
    }

    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const entries: VideoEntry[] = [];
    let currentTitle = '';

    for (const line of lines) {
      if (line.startsWith('#')) {
        // This is a title line
        currentTitle = line.substring(1).trim();
      } else if (line.trim() && currentTitle) {
        // This is a URL line, associate with current title
        entries.push({
          title: currentTitle,
          url: line.trim()
        });
      }
    }

    console.log(`📄 Loaded ${entries.length} video entries from ${filePath}`);
    return entries;
  }

  /**
   * Load URLs from deduplicated file (simple list format)
   */
  loadUrlsFromDeduplicatedFile(filePath: string = 'deduplicated-video-urls.txt'): VideoEntry[] {
    if (!existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return [];
    }

    const content = readFileSync(filePath, 'utf8');
    const urls = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));

    // Generate generic titles for deduplicated URLs
    const entries: VideoEntry[] = urls.map((url, index) => ({
      title: `Video_${index + 1}`,
      url
    }));

    console.log(`📄 Loaded ${entries.length} URLs from ${filePath} (with generic titles)`);
    return entries;
  }

  /**
   * Save failed entries to a file for retry
   */
  saveFailedEntries(results: DownloadResult[], filename: string = 'failed-video-downloads.txt'): void {
    const failedEntries = results
      .filter(result => !result.success)
      .map(result => `# ${result.title}\n${result.url}`);

    if (failedEntries.length > 0) {
      writeFileSync(filename, failedEntries.join('\n\n'), 'utf8');
      console.log(`📝 Saved ${failedEntries.length} failed entries to ${filename}`);
    }
  }

  /**
   * Create a mapping between deduplicated URLs and their original titles
   */
  createDeduplicatedMapping(
    originalFile: string = 'all-extracted-video-urls.txt',
    deduplicatedFile: string = 'deduplicated-video-urls.txt'
  ): VideoEntry[] {
    if (!existsSync(originalFile) || !existsSync(deduplicatedFile)) {
      console.log(`❌ One or both files not found: ${originalFile}, ${deduplicatedFile}`);
      return [];
    }

    // Load original key-value pairs
    const originalEntries = this.loadEntriesFromFile(originalFile);
    
    // Load deduplicated URLs
    const deduplicatedUrls = readFileSync(deduplicatedFile, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));

    // Create mapping: find original title for each deduplicated URL
    const mappedEntries: VideoEntry[] = [];
    
    for (const deduplicatedUrl of deduplicatedUrls) {
      // Find the original entry that contains this URL
      const originalEntry = originalEntries.find(entry => entry.url === deduplicatedUrl);
      
      if (originalEntry) {
        mappedEntries.push(originalEntry);
      } else {
        // Fallback: use URL as title
        mappedEntries.push({
          title: `Video_${mappedEntries.length + 1}`,
          url: deduplicatedUrl
        });
      }
    }

    console.log(`📄 Created mapping for ${mappedEntries.length} deduplicated URLs`);
    return mappedEntries;
  }
}

/**
 * Main function
 */
async function main() {
  const downloader = new YtdlpDownloader();
  
  // Check command line arguments for mode
  const args = process.argv.slice(2);
  const useDeduplicated = args.includes('--deduplicated') || args.includes('-d');
  const useOriginal = args.includes('--original') || args.includes('-o');
  
  let entries: VideoEntry[] = [];
  
  if (useDeduplicated) {
    // Use deduplicated URLs with original titles
    console.log('🔄 Using deduplicated URLs with original titles...');
    entries = downloader.createDeduplicatedMapping();
  } else if (useOriginal) {
    // Use original key-value format (includes duplicates)
    console.log('🔄 Using original key-value format...');
    entries = downloader.loadEntriesFromFile();
  } else {
    // Default: use deduplicated URLs with original titles
    console.log('🔄 Using deduplicated URLs with original titles (default)...');
    entries = downloader.createDeduplicatedMapping();
  }
  
  if (entries.length === 0) {
    console.log('❌ No video entries found. Please check the input files.');
    console.log('💡 Usage:');
    console.log('   npm run ytdlp-download                    # Use deduplicated URLs with original titles');
    console.log('   npm run ytdlp-download --deduplicated     # Use deduplicated URLs with original titles');
    console.log('   npm run ytdlp-download --original         # Use original key-value format (includes duplicates)');
    return;
  }

  // Download videos
  const result = await downloader.downloadVideos(entries);

  // Print summary
  console.log('\n📊 Download Summary:');
  console.log(`   Total Entries: ${result.total}`);
  console.log(`   Successful: ${result.successful}`);
  console.log(`   Failed: ${result.failed}`);
  console.log(`   Success Rate: ${((result.successful / result.total) * 100).toFixed(1)}%`);

  // Save failed URLs
  downloader.saveFailedEntries(result.results);

  console.log('\n✅ Download process complete!');
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { YtdlpDownloader, main }; 