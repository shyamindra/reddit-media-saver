import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * Script to identify and fix corrupted image files that are actually HTML/text content
 */
class CorruptedFileFixer {
  private downloadsDir = 'downloads';

  /**
   * Check if a file is corrupted (HTML content saved as image)
   */
  private isCorruptedImageFile(filePath: string): boolean {
    try {
      const stats = statSync(filePath);
      if (stats.size < 1024) return false; // Skip very small files
      
      const data = readFileSync(filePath);
      const sample = data.slice(0, Math.min(1024, data.length)).toString('utf8', 0, Math.min(1024, data.length));
      const lowerSample = sample.toLowerCase();
      
      // Check for HTML indicators
      return lowerSample.includes('<!doctype html') || 
             lowerSample.includes('<html') || 
             lowerSample.includes('<head') || 
             lowerSample.includes('<body') ||
             lowerSample.includes('<!DOCTYPE');
    } catch (error) {
      console.error(`Error checking file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Fix corrupted image file by renaming it to .txt extension
   */
  private fixCorruptedFile(filePath: string): void {
    try {
      const newPath = filePath.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '.txt');
      const data = readFileSync(filePath);
      
      // Write as UTF-8 text file
      writeFileSync(newPath, data.toString('utf8'), 'utf8');
      
      // Remove the original corrupted file
      unlinkSync(filePath);
      
      console.log(`✅ Fixed: ${filePath} → ${newPath}`);
    } catch (error) {
      console.error(`❌ Failed to fix ${filePath}:`, error);
    }
  }

  /**
   * Scan and fix corrupted files in a directory
   */
  private scanAndFixDirectory(dirPath: string): number {
    let fixedCount = 0;
    
    try {
      const files = readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = join(dirPath, file);
        const stats = statSync(filePath);
        
        if (stats.isFile()) {
          // Check if it's an image file
          if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
            if (this.isCorruptedImageFile(filePath)) {
              console.log(`🔧 Found corrupted image file: ${file}`);
              this.fixCorruptedFile(filePath);
              fixedCount++;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
    
    return fixedCount;
  }

  /**
   * Main method to fix all corrupted files
   */
  public async fixCorruptedFiles(): Promise<void> {
    console.log('🔍 Scanning for corrupted image files...');
    
    const directories = [
      join(this.downloadsDir, 'Images'),
      join(this.downloadsDir, 'Videos'),
      join(this.downloadsDir, 'Gifs')
    ];
    
    let totalFixed = 0;
    
    for (const dir of directories) {
      console.log(`\n📁 Scanning directory: ${dir}`);
      const fixed = this.scanAndFixDirectory(dir);
      totalFixed += fixed;
      console.log(`   Fixed ${fixed} files in ${dir}`);
    }
    
    console.log(`\n✅ Total files fixed: ${totalFixed}`);
    
    if (totalFixed === 0) {
      console.log('🎉 No corrupted files found!');
    }
  }
}

// Run the fixer if this script is executed directly
const fixer = new CorruptedFileFixer();
fixer.fixCorruptedFiles().catch(console.error);

export default CorruptedFileFixer; 