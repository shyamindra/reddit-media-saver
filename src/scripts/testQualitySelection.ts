import { readFileSync } from 'fs';

interface VideoUrlGroup {
  baseUrl: string;
  urls: string[];
  bestQualityUrl: string;
}

/**
 * Test the quality selection logic in detail
 */
function testQualitySelection() {
  const urlsFile = 'extracted-video-urls.txt';
  
  try {
    // Read all URLs
    const allUrls = readFileSync(urlsFile, 'utf8')
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    
    console.log('🧪 Testing quality selection logic...\n');
    
    // Group URLs by video ID
    const urlGroups = groupUrlsByVideo(allUrls);
    
    console.log(`📦 Found ${urlGroups.length} unique videos\n`);
    
    // Analyze each group
    for (let i = 0; i < urlGroups.length; i++) {
      const group = urlGroups[i];
      console.log(`🎥 Video ${i + 1}: ${group.baseUrl}`);
      
      // Find all available qualities
      const availableQualities = findAvailableQualities(group.urls);
      console.log(`   Available qualities: ${availableQualities.join(', ')}`);
      
      // Show which URL was selected and why
      const selectedQuality = extractQualityFromUrl(group.bestQualityUrl);
      console.log(`   Selected quality: ${selectedQuality || 'unknown'}`);
      console.log(`   Selected URL: ${group.bestQualityUrl}`);
      
      // Verify the selection is correct
      const expectedQuality = getBestAvailableQuality(availableQualities);
      if (selectedQuality === expectedQuality) {
        console.log(`   ✅ Correctly selected best available quality`);
      } else {
        console.log(`   ❌ Should have selected ${expectedQuality} but got ${selectedQuality}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

/**
 * Find all available qualities in a list of URLs
 */
function findAvailableQualities(urls: string[]): string[] {
  const qualities: string[] = [];
  const qualityOrder = ['1080p', '720p', '480p', '360p', '240p', '220p'];
  
  for (const quality of qualityOrder) {
    if (urls.some(url => url.includes(quality))) {
      qualities.push(quality);
    }
  }
  
  return qualities;
}

/**
 * Extract quality from URL
 */
function extractQualityFromUrl(url: string): string | null {
  const qualityOrder = ['1080p', '720p', '480p', '360p', '240p', '220p'];
  
  for (const quality of qualityOrder) {
    if (url.includes(quality)) {
      return quality;
    }
  }
  
  return null;
}

/**
 * Get the best available quality from a list
 */
function getBestAvailableQuality(qualities: string[]): string {
  const qualityOrder = ['1080p', '720p', '480p', '360p', '240p', '220p'];
  
  for (const quality of qualityOrder) {
    if (qualities.includes(quality)) {
      return quality;
    }
  }
  
  return 'unknown';
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
  
  // For Reddit videos without quality indicators, prefer the base v.redd.it URL
  const baseRedditUrl = urls.find(url => url.includes('v.redd.it') && !url.includes('packaged-media'));
  if (baseRedditUrl) {
    return baseRedditUrl;
  }
  
  // Fallback to first URL
  return urls[0];
}

// Run the test
testQualitySelection(); 