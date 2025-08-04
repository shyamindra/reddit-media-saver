import { readFileSync, writeFileSync, readdirSync, statSync, renameSync } from 'fs';
import { join } from 'path';

/**
 * Script to fix corrupted video files that are actually HTML content
 * These files were incorrectly saved with .mp4 extensions but contain HTML/text content
 */
class CorruptedVideoFileFixer {
  private videosDir = 'downloads/Videos';
  private notesDir = 'downloads/Notes';

  /**
   * Check if a file contains HTML content
   */
  private isHtmlContent(filePath: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf8');
      const sample = content.slice(0, 1024).toLowerCase();
      
      // Check for HTML indicators
      return sample.includes('<!doctype html') || 
             sample.includes('<html') || 
             sample.includes('<head') || 
             sample.includes('<body') ||
             sample.includes('<!DOCTYPE') ||
             sample.includes('<title>') || 
             sample.includes('<meta') || 
             sample.includes('<script') || 
             sample.includes('<style>');
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a file is suspiciously small for a video
   */
  private isSuspiciouslySmall(filePath: string): boolean {
    try {
      const stats = statSync(filePath);
      // Files smaller than 1MB are suspicious for videos
      return stats.size < 1024 * 1024;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a file has too many lines (indicating text content)
   */
  private hasTooManyLines(filePath: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      // Videos shouldn't have thousands of lines
      return lines > 1000;
    } catch (error) {
      return false;
    }
  }

  /**
   * Identify corrupted video files
   */
  private identifyCorruptedFiles(): string[] {
    const corruptedFiles: string[] = [];
    
    try {
      const files = readdirSync(this.videosDir);
      
      for (const file of files) {
        if (!file.endsWith('.mp4')) continue;
        
        const filePath = join(this.videosDir, file);
        
        // Check if file is suspicious
        const isHtml = this.isHtmlContent(filePath);
        const isSmall = this.isSuspiciouslySmall(filePath);
        const hasManyLines = this.hasTooManyLines(filePath);
        
        if (isHtml || (isSmall && hasManyLines)) {
          corruptedFiles.push(filePath);
          console.log(`🔍 Identified corrupted file: ${file}`);
          console.log(`   - Is HTML: ${isHtml}`);
          console.log(`   - Is small: ${isSmall}`);
          console.log(`   - Has many lines: ${hasManyLines}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error reading videos directory: ${error}`);
    }
    
    return corruptedFiles;
  }

  /**
   * Fix a corrupted video file by moving it to Notes directory with .txt extension
   */
  private fixCorruptedFile(filePath: string): boolean {
    try {
      const fileName = filePath.split('/').pop() || '';
      const baseName = fileName.replace('.mp4', '');
      const newFileName = `${baseName}.txt`;
      const newFilePath = join(this.notesDir, newFileName);
      
      // Read the content
      const content = readFileSync(filePath, 'utf8');
      
      // Write to new location with .txt extension
      writeFileSync(newFilePath, content, 'utf8');
      
      // Remove the original corrupted file
      const fs = require('fs');
      fs.unlinkSync(filePath);
      
      console.log(`✅ Fixed: ${fileName} → ${newFileName}`);
      return true;
    } catch (error) {
      console.error(`❌ Error fixing ${filePath}: ${error}`);
      return false;
    }
  }

  /**
   * Run the fixer
   */
  public async run(): Promise<void> {
    console.log('🔧 Starting corrupted video file fixer...');
    console.log(`📁 Scanning directory: ${this.videosDir}`);
    
    const corruptedFiles = this.identifyCorruptedFiles();
    
    if (corruptedFiles.length === 0) {
      console.log('✅ No corrupted video files found!');
      return;
    }
    
    console.log(`\n📋 Found ${corruptedFiles.length} corrupted video files:`);
    corruptedFiles.forEach(file => {
      const fileName = file.split('/').pop();
      console.log(`   - ${fileName}`);
    });
    
    console.log('\n🔧 Fixing corrupted files...');
    let fixedCount = 0;
    
    for (const filePath of corruptedFiles) {
      if (this.fixCorruptedFile(filePath)) {
        fixedCount++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} out of ${corruptedFiles.length} corrupted files`);
    console.log(`📝 Corrupted files have been moved to: ${this.notesDir}`);
  }
}

// Run the fixer if this script is executed directly
if (require.main === module) {
  const fixer = new CorruptedVideoFileFixer();
  fixer.run().catch(console.error);
}

export { CorruptedVideoFileFixer }; 