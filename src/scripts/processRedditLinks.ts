import { FileInputService } from '../services/fileInputService';
import { ContentDownloadService } from '../services/contentDownloadService';
import { writeFileSync } from 'fs';

interface CliOptions {
  mode: 'full' | 'test' | 'batch';
  limit?: number;
  offset?: number;
  delay?: number;
  inputDir?: string;
  outputDir?: string;
  retry?: boolean;
}

/**
 * Enhanced script to process Reddit URLs with command line options
 */
async function main() {
  const options = parseCommandLineArgs();
  
  console.log('🔗 Reddit Media Saver - Processing URLs...\n');
  console.log(`📋 Mode: ${options.mode}`);
  if (options.limit) console.log(`📊 Limit: ${options.limit} URLs`);
  if (options.offset) console.log(`📍 Offset: ${options.offset} URLs`);
  if (options.delay) console.log(`⏱️  Delay: ${options.delay}ms between batches`);
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

    // Show invalid URLs
    if (result.invalid.length > 0) {
      console.log('❌ Invalid URLs:');
      result.invalid.forEach(url => {
        console.log(`   ${url}`);
      });
      console.log('');
    }

    // Apply offset and limit for processing
    let urlsToProcess = result.valid;
    
    // Apply offset first
    if (options.offset && options.offset > 0) {
      if (options.offset >= urlsToProcess.length) {
        console.log(`⚠️  Offset ${options.offset} is greater than total URLs (${urlsToProcess.length}). No URLs to process.`);
        return;
      }
      urlsToProcess = urlsToProcess.slice(options.offset);
      console.log(`📍 Applied offset: Skipped first ${options.offset} URLs`);
    }
    
    // Apply limit
    if (options.limit && options.limit < urlsToProcess.length) {
      urlsToProcess = urlsToProcess.slice(0, options.limit);
      console.log(`🧪 Processing ${options.limit} URLs starting from offset ${options.offset || 0}\n`);
    }

    // Download content if we have valid URLs
    if (urlsToProcess.length > 0) {
      console.log(`🚀 Starting content download...\n`);
      
      const downloadService = new ContentDownloadService(options.outputDir);
      const summary = await downloadService.processUrls(urlsToProcess);
      
      console.log('\n📊 Download Summary:');
      console.log(`   Total processed: ${summary.total}`);
      console.log(`   Successful: ${summary.successful}`);
      console.log(`   Failed: ${summary.failed}`);
      
      // Save failed URLs for retry
      if (summary.failedUrls.length > 0) {
        const failedUrlsContent = summary.failedUrls.join('\n');
        writeFileSync('failed-downloads.txt', failedUrlsContent, 'utf-8');
        console.log(`\n📝 Failed URLs saved to: failed-downloads.txt`);
        console.log('   You can retry these URLs with: npm run retry-failed');
      }
      
      console.log(`\n📁 Downloaded content saved to: ${options.outputDir || 'downloads'}/`);
      
      // Show next batch info with delay if specified
      const nextOffset = (options.offset || 0) + summary.total;
      if (nextOffset < result.valid.length) {
        let nextCommand = `npm run process-links -- --offset ${nextOffset} --limit ${options.limit || 20}`;
        if (options.delay) {
          nextCommand += ` --delay ${options.delay}`;
        }
        console.log(`\n🔄 Next batch: ${nextCommand}`);
      }
      
      // Apply delay if specified
      if (options.delay && options.delay > 0) {
        console.log(`\n⏳ Waiting ${options.delay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
    }

    console.log('\n✨ Processing complete!');
    
  } catch (error) {
    console.error('❌ Error processing URLs:', error);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseCommandLineArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    mode: 'full'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--test':
      case '-t':
        options.mode = 'test';
        break;
      case '--batch':
      case '-b':
        options.mode = 'batch';
        break;
      case '--limit':
      case '-l':
        const limit = parseInt(args[i + 1]);
        if (!isNaN(limit)) {
          options.limit = limit;
          i++; // Skip next argument
        }
        break;
      case '--offset':
      case '-o':
        const offset = parseInt(args[i + 1]);
        if (!isNaN(offset)) {
          options.offset = offset;
          i++; // Skip next argument
        }
        break;
      case '--delay':
      case '-d':
        const delay = parseInt(args[i + 1]);
        if (!isNaN(delay)) {
          options.delay = delay;
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
      case '--retry':
      case '-r':
        options.retry = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  // Set defaults based on mode
  if (options.mode === 'test' && !options.limit) {
    options.limit = 20;
  }

  return options;
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🔗 Reddit Media Saver - URL Processor

Usage: npm run process-links [options]

Options:
  --test, -t              Test mode (processes 20 URLs by default)
  --batch, -b             Batch mode (processes all URLs)
  --limit <number>, -l    Limit number of URLs to process
  --offset <number>, -o   Start from this URL index (for rate limiting)
  --delay <number>, -d    Delay in milliseconds between batches
  --input <dir>, -i       Input directory (default: reddit-links)
  --output <dir>, -out    Output directory (default: downloads)
  --retry, -r             Retry failed downloads
  --help, -h              Show this help

Examples:
  npm run process-links                    # Process all URLs
  npm run process-links --test            # Test with 20 URLs
  npm run process-links --limit 50        # Process 50 URLs
  npm run process-links --offset 20 --limit 20  # Process URLs 20-40
  npm run process-links --input my-links  # Use custom input directory
  npm run process-links --output my-downloads  # Use custom output directory

Rate Limiting Examples:
  npm run process-links --limit 20                    # First 20 URLs
  npm run process-links --offset 20 --limit 20       # URLs 20-40
  npm run process-links --offset 40 --limit 20       # URLs 40-60
  npm run process-links --offset 60 --limit 20       # URLs 60-80

Delay Examples:
  npm run process-links --limit 20 --delay 5000      # Process 20 URLs, wait 5s
  npm run process-links --limit 10 --delay 10000     # Process 10 URLs, wait 10s
  npm run process-links --offset 100 --limit 15 --delay 3000  # Process 15 URLs from offset 100, wait 3s

Modes:
  full    - Process all URLs (default)
  test    - Process limited URLs for testing
  batch   - Process URLs in batches
`);
}

// Run the script
main();

export { main }; 