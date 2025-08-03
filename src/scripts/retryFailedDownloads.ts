import { FileInputService } from '../services/fileInputService';
import { ContentDownloadService } from '../services/contentDownloadService';
import { writeFileSync } from 'fs';

/**
 * Retry failed downloads from failed-downloads.txt
 */
async function main() {
  console.log('🔄 Retrying failed downloads...\n');

  try {
    // Process URLs from failed downloads file (still using txt for failed downloads)
    const result = FileInputService.processRedditUrls('failed-downloads.txt');
    
    if (result.valid.length === 0) {
      console.log('❌ No valid URLs found in failed-downloads.txt');
      return;
    }

    console.log(`📊 Found ${result.valid.length} valid URLs to retry\n`);
    
    // Download content
    const downloadService = new ContentDownloadService();
    const summary = await downloadService.processUrls(result.valid);
    
    console.log('\n📊 Retry Summary:');
    console.log(`   Total processed: ${summary.total}`);
    console.log(`   Successful: ${summary.successful}`);
    console.log(`   Failed: ${summary.failed}`);
    
    // Update failed downloads file with any new failures
    if (summary.failedUrls.length > 0) {
      const failedUrlsContent = summary.failedUrls.join('\n');
      writeFileSync('failed-downloads.txt', failedUrlsContent, 'utf-8');
      console.log(`\n📝 Updated failed-downloads.txt with ${summary.failedUrls.length} URLs`);
    } else {
      // Clear the file if all retries succeeded
      writeFileSync('failed-downloads.txt', '', 'utf-8');
      console.log('\n✅ All retries successful! failed-downloads.txt cleared.');
    }
    
    console.log(`\n📁 Downloaded content saved to: downloads/`);
    console.log('\n✨ Retry complete!');
    
  } catch (error) {
    console.error('❌ Error during retry:', error);
  }
}

main(); 