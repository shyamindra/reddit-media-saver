import { FileInputService } from '../services/fileInputService';
import { ContentDownloadService } from '../services/contentDownloadService';
import { writeFileSync } from 'fs';

/**
 * Simple script to process Reddit URLs from a text file and download content
 */
async function main() {
  console.log('🔗 Processing Reddit URLs from file...\n');

  try {
    // Process URLs from CSV files
    const result = FileInputService.processRedditUrlsFromCsv();
    
    console.log(`📊 URL Validation Results:`);
    console.log(`   Total URLs found: ${result.valid.length + result.invalid.length}`);
    console.log(`   Valid URLs: ${result.valid.length}`);
    console.log(`   Invalid URLs: ${result.invalid.length}\n`);

    // Show invalid URLs
    if (result.invalid.length > 0) {
      console.log('❌ Invalid URLs:');
      result.invalid.forEach(url => {
        console.log(`   ${url}`);
      });
      console.log('');
    }

    // Download content if we have valid URLs
    if (result.valid.length > 0) {
      console.log(`🚀 Starting content download...\n`);
      
      const downloadService = new ContentDownloadService();
      const summary = await downloadService.processUrls(result.valid);
      
      console.log('\n📊 Download Summary:');
      console.log(`   Total processed: ${summary.total}`);
      console.log(`   Successful: ${summary.successful}`);
      console.log(`   Failed: ${summary.failed}`);
      
      // Save failed URLs for retry
      if (summary.failedUrls.length > 0) {
        const failedUrlsContent = summary.failedUrls.join('\n');
        writeFileSync('failed-downloads.txt', failedUrlsContent, 'utf-8');
        console.log(`\n📝 Failed URLs saved to: failed-downloads.txt`);
        console.log('   You can retry these URLs later.');
      }
      
      console.log(`\n📁 Downloaded content saved to: downloads/`);
    }

    console.log('\n✨ Processing complete!');
    
  } catch (error) {
    console.error('❌ Error processing URLs:', error);
  }
}

// Run the script
main();

export { main }; 