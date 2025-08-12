import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import axios from 'axios';

interface VideoUrlGroup {
  baseUrl: string;
  urls: string[];
  bestQualityUrl: string;
}

interface DownloadResult {
  url: string;
  success: boolean;
  error?: string;
  filePath?: string;
  fileSize?: number;
}

/**
 * Download extracted video URLs with quality selection and error handling
 */
async function downloadExtractedVideos() {
  const urlsFile = 'extracted-video-urls.txt';
  const failedFile = 'failed-video-downloads.txt';
  const downloadsDir = 'downloads/Videos';
  
  console.log('🎬 Starting download of extracted video URLs...\n');
  
  // Create downloads directory if it doesn't exist
  if (!existsSync(downloadsDir)) {
    mkdirSync(downloadsDir, { recursive: true });
  }
  
  try {
    // Read all URLs
    const allUrls = readFileSync(urlsFile, 'utf8')
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    
    console.log(`📋 Found ${allUrls.length} URLs to process`);
    
    // Group URLs by base video ID
    const urlGroups = groupUrlsByVideo(allUrls);
    console.log(`📦 Grouped into ${urlGroups.length} unique videos\n`);
    
    const results: DownloadResult[] = [];
    const failedUrls: string[] = [];
    
    // Process each video group
    for (let i = 0; i < urlGroups.length; i++) {
      const group = urlGroups[i];
      console.log(`🎥 Processing video ${i + 1}/${urlGroups.length}: ${group.baseUrl}`);
      
      // Skip if no valid URL was found
      if (!group.bestQualityUrl) {
        console.log(`⏭️  Skipping: No valid video URL found`);
        continue;
      }
      
      try {
        const result = await downloadBestQualityVideo(group, downloadsDir);
        results.push(result);
        
        if (result.success) {
          console.log(`✅ Downloaded: ${basename(result.filePath!)} (${formatFileSize(result.fileSize!)})`);
        } else {
          console.log(`❌ Failed: ${result.error}`);
          failedUrls.push(group.bestQualityUrl);
        }
        
        // Add delay between downloads to avoid rate limiting
        if (i < urlGroups.length - 1) {
          console.log('⏳ Waiting 3 seconds before next download...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.log(`💥 Error processing video: ${error}`);
        failedUrls.push(group.bestQualityUrl);
      }
    }
    
    // Save failed URLs
    if (failedUrls.length > 0) {
      writeFileSync(failedFile, failedUrls.join('\n'), 'utf8');
      console.log(`\n❌ ${failedUrls.length} downloads failed. See ${failedFile}`);
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    console.log(`\n📊 Download Summary:`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failedUrls.length}`);
    console.log(`📁 Files saved to: ${downloadsDir}`);
    
  } catch (error) {
    console.error('💥 Error reading URLs file:', error);
  }
}

/**
 * Group URLs by video ID to avoid downloading multiple resolutions of the same video
 */
function groupUrlsByVideo(urls: string[]): VideoUrlGroup[] {
  const groups = new Map<string, VideoUrlGroup>();
  
  for (const url of urls) {
    let baseUrl = url;
    let videoId = '';
    
    // Extract video ID for Reddit videos (both v.redd.it and packaged-media)
    if (url.includes('v.redd.it')) {
      const match = url.match(/https:\/\/v\.redd\.it\/([^\/]+)/);
      if (match) {
        videoId = match[1];
        baseUrl = `reddit_${videoId}`;
      }
    }
    // Extract video ID for Reddit packaged media
    else if (url.includes('packaged-media.redd.it')) {
      const match = url.match(/packaged-media\.redd\.it\/([^\/]+)/);
      if (match) {
        videoId = match[1];
        baseUrl = `reddit_${videoId}`;
      }
    }
    // Extract base URL for RedGIFs
    else if (url.includes('redgifs.com')) {
      const match = url.match(/https:\/\/media\.redgifs\.com\/([^\/]+)/);
      if (match) {
        videoId = match[1];
        baseUrl = `redgifs_${videoId}`;
      }
    }
    
    if (!groups.has(baseUrl)) {
      groups.set(baseUrl, {
        baseUrl,
        urls: [],
        bestQualityUrl: ''
      });
    }
    
    const group = groups.get(baseUrl)!;
    group.urls.push(url);
  }
  
  // Select best quality URL for each group
  for (const group of groups.values()) {
    group.bestQualityUrl = selectBestQualityUrl(group.urls);
  }
  
  return Array.from(groups.values());
}

/**
 * Select the best quality URL from a list of URLs
 */
function selectBestQualityUrl(urls: string[]): string {
  // Priority order: 1080p > 720p > 480p > 360p > 240p > 220p > others
  const qualityOrder = ['1080p', '720p', '480p', '360p', '240p', '220p'];
  
  // First try to find URLs with quality indicators
  for (const quality of qualityOrder) {
    const qualityUrl = urls.find(url => url.includes(quality));
    if (qualityUrl) {
      return qualityUrl;
    }
  }
  
  // If no quality indicators, prefer RedGIFs over Reddit URLs
  const redgifsUrl = urls.find(url => url.includes('redgifs.com'));
  if (redgifsUrl) {
    return redgifsUrl;
  }
  
  // For Reddit videos without quality indicators, prefer packaged media over base URLs
  const packagedUrl = urls.find(url => url.includes('packaged-media.redd.it'));
  if (packagedUrl) {
    return packagedUrl;
  }
  
  // Skip base v.redd.it URLs entirely - they return HTML, not video
  // const baseRedditUrl = urls.find(url => url.includes('v.redd.it') && !url.includes('packaged-media'));
  // if (baseRedditUrl) {
  //   return baseRedditUrl;
  // }
  
  // Skip videos that only have base Reddit URLs (they return HTML, not video)
  console.log(`⚠️  Skipping video with only base Reddit URLs (they return HTML, not video)`);
  return '';
}

/**
 * Download the best quality video with error handling
 */
async function downloadBestQualityVideo(group: VideoUrlGroup, downloadsDir: string): Promise<DownloadResult> {
  const url = group.bestQualityUrl;
  
  try {
    // Set timeout and retry configuration
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      validateStatus: (status) => status < 500 // Accept all status codes below 500
    });
    
    // Check for 403 or other error status codes
    if (response.status === 403) {
      return {
        url,
        success: false,
        error: '403 Forbidden - Access denied'
      };
    }
    
    if (response.status !== 200) {
      return {
        url,
        success: false,
        error: `HTTP ${response.status} - ${response.statusText}`
      };
    }
    
    // Generate filename
    const filename = generateFilename(url, group.baseUrl);
    const filePath = join(downloadsDir, filename);
    
    // Save file
    writeFileSync(filePath, response.data);
    
    return {
      url,
      success: true,
      filePath,
      fileSize: response.data.length
    };
    
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      return {
        url,
        success: false,
        error: 'Request timeout'
      };
    }
    
    if (error.response?.status === 403) {
      return {
        url,
        success: false,
        error: '403 Forbidden - Access denied'
      };
    }
    
    return {
      url,
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Generate a filename for the video
 */
function generateFilename(url: string, baseUrl: string): string {
  let filename = '';
  
  if (url.includes('redgifs.com')) {
    // Extract RedGIFs filename
    const match = url.match(/https:\/\/media\.redgifs\.com\/([^\/]+)/);
    if (match) {
      filename = match[1];
      // Remove .mp4 extension if it's already in the filename
      if (filename.endsWith('.mp4')) {
        filename = filename.slice(0, -4);
      }
    }
  } else if (url.includes('v.redd.it')) {
    // Extract Reddit video ID
    const match = url.match(/https:\/\/v\.redd\.it\/([^\/]+)/);
    if (match) {
      filename = `reddit_${match[1]}`;
    }
  } else if (url.includes('packaged-media.redd.it')) {
    // Extract Reddit packaged media ID
    const match = url.match(/packaged-media\.redd\.it\/([^\/]+)/);
    if (match) {
      filename = `reddit_packaged_${match[1]}`;
    }
  }
  
  // Add quality indicator if present
  if (url.includes('1080p')) filename += '_1080p';
  else if (url.includes('720p')) filename += '_720p';
  else if (url.includes('480p')) filename += '_480p';
  else if (url.includes('360p')) filename += '_360p';
  else if (url.includes('240p')) filename += '_240p';
  else if (url.includes('220p')) filename += '_220p';
  
  // Add extension (always .mp4)
  filename += '.mp4';
  
  return filename;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the script
downloadExtractedVideos().catch(console.error); 