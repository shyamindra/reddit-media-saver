import { readdirSync, renameSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Fix existing video files by renaming double extensions and identifying corrupted files
 */
async function fixVideoFiles() {
  const videosDir = 'downloads/Videos';
  
  console.log('🔧 Fixing video files...\n');
  
  try {
    const files = readdirSync(videosDir);
    const videoFiles = files.filter(file => file.endsWith('.mp4'));
    
    console.log(`📁 Found ${videoFiles.length} video files\n`);
    
    let renamedCount = 0;
    let corruptedFiles: string[] = [];
    
    for (const file of videoFiles) {
      const filePath = join(videosDir, file);
      
      // Fix double .mp4.mp4 extension
      if (file.includes('.mp4.mp4')) {
        const newName = file.replace('.mp4.mp4', '.mp4');
        const newPath = join(videosDir, newName);
        
        try {
          renameSync(filePath, newPath);
          console.log(`✅ Renamed: ${file} → ${newName}`);
          renamedCount++;
        } catch (error) {
          console.log(`❌ Failed to rename ${file}: ${error}`);
        }
      }
      
      // Check if file is corrupted (very small or can't be read by ffprobe)
      try {
        const stats = require('fs').statSync(filePath);
        if (stats.size < 100000) { // Less than 100KB
          corruptedFiles.push(file);
          console.log(`⚠️  Small file detected: ${file} (${stats.size} bytes)`);
          continue;
        }
        
        // Try to read with ffprobe
        await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
        
      } catch (error) {
        corruptedFiles.push(file);
        console.log(`❌ Corrupted file detected: ${file}`);
      }
    }
    
    console.log(`\n📊 Fix Summary:`);
    console.log(`✅ Renamed files: ${renamedCount}`);
    console.log(`❌ Corrupted files: ${corruptedFiles.length}`);
    
    if (corruptedFiles.length > 0) {
      console.log(`\n🗑️  Corrupted files to remove:`);
      corruptedFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
      
      // Ask if user wants to remove corrupted files
      console.log(`\n💡 These files appear to be corrupted and should be re-downloaded.`);
      console.log(`   You can run the download script again to get proper versions.`);
    }
    
  } catch (error) {
    console.error('💥 Error fixing videos:', error);
  }
}

// Run the fix
fixVideoFiles().catch(console.error); 