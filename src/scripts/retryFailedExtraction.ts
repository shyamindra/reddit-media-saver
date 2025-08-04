import { VideoUrlExtractor } from './extractAllVideoUrls';
import { readFileSync, existsSync } from 'fs';

async function retryFailedExtraction() {
  const extractor = new VideoUrlExtractor();
  
  try {
    // Check if failed requests file exists and has the new format
    const failedFile = 'failed-extraction-requests.txt';
    if (!existsSync(failedFile)) {
      console.log('❌ No failed requests file found');
      return;
    }

    const content = readFileSync(failedFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('✅ No failed requests to retry');
      return;
    }

    // Check if it's in the new format (has # comments)
    const hasNewFormat = lines.some(line => line.startsWith('#'));
    
    if (!hasNewFormat) {
      console.log('⚠️  Failed requests file is in old format. Please run the main extraction first.');
      return;
    }

    // Extract URLs from the key-value format
    const failedUrls: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#')) {
        // This is a title line, the next line should be the URL
        if (i + 1 < lines.length && !lines[i + 1].startsWith('#'') && lines[i + 1].trim()) {
          failedUrls.push(lines[i + 1].trim());
        }
      }
    }

    console.log(`📊 Found ${failedUrls.length} failed URLs to retry`);

    const videoUrls = await extractor.retryFailedRequests();
    
    if (videoUrls.length > 0) {
      console.log(`\n✅ Retry extraction complete! Found ${videoUrls.length} video URLs`);
    } else {
      console.log('\nℹ️  No video URLs found in retry.');
    }
  } catch (error) {
    console.error('❌ Error during retry:', error);
  }
}

retryFailedExtraction().catch(console.error); 