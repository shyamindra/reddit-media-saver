import { existsSync, readdirSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';
import extractionConfig from '../config/extraction.config';

interface CleanupOptions {
  keepFinalResults?: boolean;
  verbose?: boolean;
}

class TempFileCleaner {
  private config = extractionConfig;

  /**
   * Clean up temporary files after extraction
   */
  async cleanupTempFiles(options: CleanupOptions = {}): Promise<void> {
    const { keepFinalResults = true, verbose = true } = options;
    
    console.log('🧹 Starting cleanup of temporary files...');
    
    try {
      // Clean up batch files
      await this.cleanupBatchFiles(verbose);
      
      // Clean up intermediate deduplication files
      await this.cleanupIntermediateFiles(verbose);
      
      // Clean up failed request files (optional)
      if (!keepFinalResults) {
        await this.cleanupFailedRequestFiles(verbose);
      }
      
      console.log('✅ Cleanup completed successfully!');
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Clean up batch files created during extraction
   */
  private async cleanupBatchFiles(verbose: boolean): Promise<void> {
    const extractedFilesDir = this.config.files.extractedFilesDir;
    
    if (!existsSync(extractedFilesDir)) {
      if (verbose) console.log('📁 No extracted_files directory found');
      return;
    }

    const files = readdirSync(extractedFilesDir);
    const batchFiles = files.filter(file => 
      file.includes('batch') && 
      file.endsWith('.txt') &&
      !file.includes('final')
    );

    for (const file of batchFiles) {
      const filePath = join(extractedFilesDir, file);
      try {
        unlinkSync(filePath);
        if (verbose) console.log(`🗑️  Removed batch file: ${file}`);
      } catch (error) {
        if (verbose) console.log(`⚠️  Could not remove ${file}: ${error}`);
      }
    }

    if (verbose && batchFiles.length > 0) {
      console.log(`📊 Removed ${batchFiles.length} batch files`);
    }
  }

  /**
   * Clean up intermediate deduplication files
   */
  private async cleanupIntermediateFiles(verbose: boolean): Promise<void> {
    const extractedFilesDir = this.config.files.extractedFilesDir;
    
    if (!existsSync(extractedFilesDir)) {
      return;
    }

    const files = readdirSync(extractedFilesDir);
    const intermediateFiles = files.filter(file => 
      file.includes('deduplicated') && 
      file.includes('list') &&
      file.endsWith('.txt')
    );

    for (const file of intermediateFiles) {
      const filePath = join(extractedFilesDir, file);
      try {
        unlinkSync(filePath);
        if (verbose) console.log(`🗑️  Removed intermediate file: ${file}`);
      } catch (error) {
        if (verbose) console.log(`⚠️  Could not remove ${file}: ${error}`);
      }
    }

    if (verbose && intermediateFiles.length > 0) {
      console.log(`📊 Removed ${intermediateFiles.length} intermediate files`);
    }
  }

  /**
   * Clean up failed request files
   */
  private async cleanupFailedRequestFiles(verbose: boolean): Promise<void> {
    const failedRequestsDir = this.config.files.failedRequestsDir;
    
    if (!existsSync(failedRequestsDir)) {
      if (verbose) console.log('📁 No failed_requests directory found');
      return;
    }

    const files = readdirSync(failedRequestsDir);
    const failedFiles = files.filter(file => file.endsWith('.txt'));

    for (const file of failedFiles) {
      const filePath = join(failedRequestsDir, file);
      try {
        unlinkSync(filePath);
        if (verbose) console.log(`🗑️  Removed failed request file: ${file}`);
      } catch (error) {
        if (verbose) console.log(`⚠️  Could not remove ${file}: ${error}`);
      }
    }

    if (verbose && failedFiles.length > 0) {
      console.log(`📊 Removed ${failedFiles.length} failed request files`);
    }

    // Try to remove the failed_requests directory if empty
    try {
      const remainingFiles = readdirSync(failedRequestsDir);
      if (remainingFiles.length === 0) {
        rmdirSync(failedRequestsDir);
        if (verbose) console.log('📁 Removed empty failed_requests directory');
      }
    } catch (error) {
      // Directory not empty or other error, ignore
    }
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStats(): { batchFiles: number; intermediateFiles: number; failedFiles: number } {
    const extractedFilesDir = this.config.files.extractedFilesDir;
    const failedRequestsDir = this.config.files.failedRequestsDir;
    
    let batchFiles = 0;
    let intermediateFiles = 0;
    let failedFiles = 0;

    if (existsSync(extractedFilesDir)) {
      const files = readdirSync(extractedFilesDir);
      batchFiles = files.filter(file => 
        file.includes('batch') && 
        file.endsWith('.txt') &&
        !file.includes('final')
      ).length;
      
      intermediateFiles = files.filter(file => 
        file.includes('deduplicated') && 
        file.includes('list') &&
        file.endsWith('.txt')
      ).length;
    }

    if (existsSync(failedRequestsDir)) {
      const files = readdirSync(failedRequestsDir);
      failedFiles = files.filter(file => file.endsWith('.txt')).length;
    }

    return { batchFiles, intermediateFiles, failedFiles };
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const cleaner = new TempFileCleaner();
  
  try {
    // Show cleanup statistics
    const stats = cleaner.getCleanupStats();
    console.log('📊 Cleanup Statistics:');
    console.log(`   Batch files: ${stats.batchFiles}`);
    console.log(`   Intermediate files: ${stats.intermediateFiles}`);
    console.log(`   Failed request files: ${stats.failedFiles}`);
    
    if (stats.batchFiles === 0 && stats.intermediateFiles === 0 && stats.failedFiles === 0) {
      console.log('✅ No temporary files found to clean up');
      return;
    }
    
    // Perform cleanup
    await cleaner.cleanupTempFiles({ keepFinalResults: true, verbose: true });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TempFileCleaner, main }; 