import { FileInputService } from '../services/fileInputService';
import { ContentDownloadService } from '../services/contentDownloadService';
import { writeFileSync } from 'fs';

interface AutoDownloadOptions {
  batchSize?: number;
  delaySeconds?: number;
  limit?: number;
  inputDir?: string;
  outputDir?: string;
  startOffset?: number;
}

/**
 * Automatic download script that processes URLs in batches with delays
 */
async function autoDownload() {
  const options = parseCommandLineArgs();
  
  console.log('🤖 Auto Download - Processing URLs in batches...\n');
  console.log(`📋 Batch Size: ${options.batchSize!} URLs`);
  console.log(`⏱️  Delay: ${options.delaySeconds!} seconds between batches`);
  if (options.limit) console.log(`📊 Limit: ${options.limit} URLs`);
  if (options.startOffset) console.log(`📍 Start Offset: ${options.startOffset} URLs`);
  if (options.inputDir) console.log(`📁 Input: ${options.inputDir}`);
  if (options.outputDir) console.log(`📁 Output: ${options.outputDir}`);
  console.log('');

  try {
    // Process URLs from CSV files
    const result = FileInputService.processRedditUrlsFromCsv(options.inputDir);
    
    console.log(`📊 URL Validation Results:`);
    console.log(`   Total URLs found: ${result.valid.length + result.invalid.length}`);
    console.log(`   Valid URLs: ${result.valid.length}`);
    console.log(`   Invalid URLs: ${result.invalid.length}\n`);

    if (result.valid.length === 0) {
      console.log('❌ No valid URLs found to process');
      return;
    }

    // Apply start offset
    let urlsToProcess = result.valid;
    if (options.startOffset && options.startOffset > 0) {
      if (options.startOffset >= urlsToProcess.length) {
        console.log(`⚠️  Start offset ${options.startOffset} is greater than total URLs (${urlsToProcess.length}). No URLs to process.`);
        return;
      }
      urlsToProcess = urlsToProcess.slice(options.startOffset);
      console.log(`📍 Applied start offset: Skipped first ${options.startOffset} URLs`);
    }

    // Apply limit if specified
    if (options.limit && options.limit < urlsToProcess.length) {
      urlsToProcess = urlsToProcess.slice(0, options.limit);
      console.log(`📊 Applied limit: Processing ${options.limit} URLs`);
    }

    const totalBatches = Math.ceil(urlsToProcess.length / options.batchSize!);
    console.log(`🔄 Will process ${urlsToProcess.length} URLs in ${totalBatches} batches of ${options.batchSize!} each\n`);

    const downloadService = new ContentDownloadService(options.outputDir);
    let totalSuccessful = 0;
    let totalFailed = 0;
    const allFailedUrls: string[] = [];

    // Process in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * options.batchSize!;
      const endIndex = Math.min(startIndex + options.batchSize!, urlsToProcess.length);
      const batchUrls = urlsToProcess.slice(startIndex, endIndex);
      const currentOffset = (options.startOffset || 0) + startIndex;

      console.log(`\n📦 Batch ${batchIndex + 1}/${totalBatches} (URLs ${currentOffset}-${currentOffset + batchUrls.length - 1})`);
      console.log(`⏱️  Processing ${batchUrls.length} URLs...\n`);

      // Process this batch
      const summary = await downloadService.processUrls(batchUrls);
      
      totalSuccessful += summary.successful;
      totalFailed += summary.failed;
      allFailedUrls.push(...summary.failedUrls);

      console.log(`\n📊 Batch ${batchIndex + 1} Summary:`);
      console.log(`   Processed: ${summary.total}`);
      console.log(`   Successful: ${summary.successful}`);
      console.log(`   Failed: ${summary.failed}`);
      console.log(`   Progress: ${totalSuccessful + totalFailed}/${urlsToProcess.length} (${((totalSuccessful + totalFailed) / urlsToProcess.length * 100).toFixed(1)}%)`);

      // Wait before next batch (except for the last batch)
      if (batchIndex < totalBatches - 1) {
        console.log(`\n⏳ Waiting ${options.delaySeconds!} seconds before next batch...`);
        await sleep(options.delaySeconds! * 1000);
      }
    }

    // Final summary
    console.log('\n🎉 AUTO DOWNLOAD COMPLETE!');
    console.log('📊 Final Summary:');
    console.log(`   Total URLs: ${urlsToProcess.length}`);
    console.log(`   Successful: ${totalSuccessful}`);
    console.log(`   Failed: ${totalFailed}`);
    console.log(`   Success Rate: ${((totalSuccessful / urlsToProcess.length) * 100).toFixed(1)}%`);

    // Save failed URLs for retry
    if (allFailedUrls.length > 0) {
      writeFileSync('failed-downloads.txt', allFailedUrls.join('\n'), 'utf8');
      console.log(`\n📝 Failed URLs saved to: failed-downloads.txt`);
      console.log(`🔄 Run 'npm run retry-failed' to retry failed downloads`);
    }

    // Process text files for video extraction
    console.log('\n🔍 Processing text files for video extraction...');
    const textFileResult = await downloadService.processTextFilesForVideos();
    
    if (textFileResult.downloaded > 0) {
      console.log(`\n✅ Video extraction complete: ${textFileResult.downloaded} videos downloaded from text files`);
    } else {
      console.log(`\nℹ️  No videos found in text files`);
    }

    console.log('\n🚀 All processing complete!');
  } catch (error) {
    console.error('❌ Auto download failed:', error);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseCommandLineArgs(): AutoDownloadOptions {
  const args = process.argv.slice(2);
  const options: AutoDownloadOptions = {
    batchSize: 20,
    delaySeconds: 20,
    startOffset: 0
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--batch-size':
      case '-b':
        const batchSize = parseInt(args[i + 1]);
        if (!isNaN(batchSize) && batchSize > 0) {
          options.batchSize = batchSize;
          i++; // Skip next argument
        }
        break;
      case '--delay':
      case '-d':
        const delay = parseInt(args[i + 1]);
        if (!isNaN(delay) && delay >= 0) {
          options.delaySeconds = delay;
          i++; // Skip next argument
        }
        break;
      case '--limit':
      case '-l':
        const limit = parseInt(args[i + 1]);
        if (!isNaN(limit) && limit > 0) {
          options.limit = limit;
          i++; // Skip next argument
        }
        break;
      case '--offset':
      case '-o':
        const offset = parseInt(args[i + 1]);
        if (!isNaN(offset) && offset >= 0) {
          options.startOffset = offset;
          i++; // Skip next argument
        }
        break;
      case '--input':
      case '-i':
        options.inputDir = args[i + 1];
        i++; // Skip next argument
        break;
      case '--output':
      case '-out':
        options.outputDir = args[i + 1];
        i++; // Skip next argument
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * Sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🤖 Auto Download - Automatic batch processing with delays

Usage: npm run auto-download [options]

Options:
  --batch-size <number>, -b    Batch size (default: 20)
  --delay <seconds>, -d        Delay between batches (default: 20)
  --limit <number>, -l         Limit total number of URLs to process
  --offset <number>, -o        Start from this URL index (default: 0)
  --input <dir>, -i            Input directory (default: reddit-links)
  --output <dir>, -out         Output directory (default: downloads)
  --help, -h                   Show this help

Examples:
  npm run auto-download                    # Default: 20 URLs, 20s delay
  npm run auto-download --batch-size 10   # 10 URLs per batch
  npm run auto-download --delay 30        # 30 seconds between batches
  npm run auto-download --limit 50        # Process only 50 URLs total
  npm run auto-download --offset 100      # Start from URL 100
  npm run auto-download --batch-size 15 --delay 25  # Custom settings
  npm run auto-download --limit 30 --batch-size 10  # Process 30 URLs in batches of 10

Rate Limiting:
  This script automatically handles rate limiting by:
  - Processing URLs in small batches
  - Waiting between batches
  - Showing progress and statistics
  - Saving failed URLs for retry
`);
}

// Run the script
autoDownload();

export { autoDownload }; 