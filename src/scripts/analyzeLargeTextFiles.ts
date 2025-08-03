import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

interface VideoUrlInfo {
  originalFile: string;
  extractedUrls: string[];
  contentType: string;
  fileSize: number;
}

/**
 * Analyze large text files to extract video URLs from HTML content
 */
async function analyzeLargeTextFiles() {
  const notesDir = 'downloads/Notes';
  const largeFiles: VideoUrlInfo[] = [];
  
  console.log('🔍 Analyzing large text files for embedded video URLs...\n');
  
  try {
    const files = readdirSync(notesDir);
    
    for (const file of files) {
      if (!file.endsWith('.txt')) continue;
      
      const filePath = join(notesDir, file);
      const stats = readFileSync(filePath).length;
      
      // Focus on files larger than 10KB (likely HTML content)
      if (stats > 10240) {
        const content = readFileSync(filePath, 'utf8');
        const extractedUrls = extractVideoUrls(content);
        
        largeFiles.push({
          originalFile: file,
          extractedUrls,
          contentType: detectContentType(content),
          fileSize: stats
        });
      }
    }
    
    // Display results
    console.log(`📊 Found ${largeFiles.length} large text files to analyze:\n`);
    
    let totalVideosFound = 0;
    
    for (const fileInfo of largeFiles) {
      console.log(`📁 ${fileInfo.originalFile}`);
      console.log(`   Size: ${formatFileSize(fileInfo.fileSize)}`);
      console.log(`   Type: ${fileInfo.contentType}`);
      
      if (fileInfo.extractedUrls.length > 0) {
        console.log(`   🎬 Found ${fileInfo.extractedUrls.length} video URL(s):`);
        fileInfo.extractedUrls.forEach((url, index) => {
          console.log(`      ${index + 1}. ${url}`);
        });
        totalVideosFound += fileInfo.extractedUrls.length;
      } else {
        console.log(`   ❌ No video URLs found`);
      }
      console.log('');
    }
    
    console.log(`📈 Summary:`);
    console.log(`   Total large files: ${largeFiles.length}`);
    console.log(`   Total video URLs found: ${totalVideosFound}`);
    
    // Save extracted URLs to a file
    const allUrls = largeFiles.flatMap(f => f.extractedUrls);
    if (allUrls.length > 0) {
      const outputFile = 'extracted-video-urls.txt';
      writeFileSync(outputFile, allUrls.join('\n'), 'utf8');
      console.log(`\n💾 Extracted video URLs saved to: ${outputFile}`);
    }
    
    // Generate recovery script
    generateRecoveryScript(largeFiles);
    
  } catch (error) {
    console.error('❌ Error analyzing files:', error);
  }
}

/**
 * Extract video URLs from HTML content
 */
function extractVideoUrls(htmlContent: string): string[] {
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
 * Detect content type from HTML content
 */
function detectContentType(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('redgifs.com')) {
    return 'RedGIFs HTML Page';
  }
  
  if (lowerContent.includes('v.redd.it') || lowerContent.includes('reddit.com')) {
    return 'Reddit Video HTML Page';
  }
  
  if (lowerContent.includes('<!doctype html') || lowerContent.includes('<html')) {
    return 'Generic HTML Page';
  }
  
  return 'Unknown';
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Generate a recovery script to download the extracted video URLs
 */
function generateRecoveryScript(files: VideoUrlInfo[]) {
  const scriptContent = `import { ContentDownloadService } from '../services/contentDownloadService';

/**
 * Recovery script to download videos from extracted URLs
 * Generated on ${new Date().toISOString()}
 */
async function recoverVideos() {
  console.log('🎬 Starting video recovery process...\\n');
  
  const downloadService = new ContentDownloadService('downloads/Videos');
  
  const videoUrls = [
${files.flatMap(f => f.extractedUrls).map(url => `    '${url}'`).join(',\n')}
  ];
  
  console.log(\`📊 Found \${videoUrls.length} video URLs to download\\n\`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    console.log(\`[\${i + 1}/\${videoUrls.length}] Downloading: \${url}\`);
    
    try {
      const result = await downloadService.downloadMedia(url, \`Recovered_Video_\${i + 1}\`, 'recovered');
      
      if (result.success) {
        console.log(\`✅ Success: \${result.filePath}\`);
        successCount++;
      } else {
        console.log(\`❌ Failed: \${result.error}\`);
        failCount++;
      }
    } catch (error) {
      console.log(\`❌ Error: \${error}\`);
      failCount++;
    }
    
    // Add delay between downloads
    if (i < videoUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(\`\\n📊 Recovery Summary:\`);
  console.log(\`   Successful: \${successCount}\`);
  console.log(\`   Failed: \${failCount}\`);
  console.log(\`   Total: \${videoUrls.length}\`);
}

// Run the recovery
recoverVideos().catch(console.error);
`;

  writeFileSync('src/scripts/recoverVideos.ts', scriptContent, 'utf8');
  console.log('📝 Recovery script generated: src/scripts/recoverVideos.ts');
}

// Run the analysis
analyzeLargeTextFiles().catch(console.error); 