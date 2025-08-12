import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check video file integrity and identify issues
 */
async function checkVideoIntegrity() {
  const videosDir = 'downloads/Videos';
  
  console.log('🔍 Checking video integrity...\n');
  
  try {
    const files = readdirSync(videosDir);
    const videoFiles = files.filter(file => file.endsWith('.mp4'));
    
    console.log(`📁 Found ${videoFiles.length} video files\n`);
    
    for (const file of videoFiles) {
      const filePath = join(videosDir, file);
      const stats = statSync(filePath);
      
      console.log(`🎥 Checking: ${file} (${formatFileSize(stats.size)})`);
      
      try {
        // Check if file is actually a video
        const { stdout } = await execAsync(`file "${filePath}"`);
        console.log(`   📄 File type: ${stdout.trim()}`);
        
        // Try ffprobe to get detailed info
        const { stdout: probeOutput } = await execAsync(`ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration -of csv=p=0 "${filePath}"`);
        console.log(`   📹 Video info: ${probeOutput.trim()}`);
        
        // Check if file has proper MP4 structure
        const { stdout: mp4info } = await execAsync(`ffprobe -v quiet -show_entries format=format_name,duration,size -of csv=p=0 "${filePath}"`);
        console.log(`   📦 Container: ${mp4info.trim()}`);
        
        // Try to get first few bytes to see what we're actually dealing with
        const { stdout: hexdump } = await execAsync(`hexdump -C "${filePath}" | head -5`);
        console.log(`   🔍 First bytes:`);
        hexdump.split('\n').slice(0, 3).forEach(line => {
          console.log(`      ${line}`);
        });
        
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        
        // Check if it's actually an HTML file
        try {
          const { stdout } = await execAsync(`head -c 1000 "${filePath}" | grep -i "html\|<!doctype" || echo "No HTML found"`);
          if (stdout.includes('html') || stdout.includes('<!doctype')) {
            console.log(`   🚨 This appears to be an HTML file, not a video!`);
          }
        } catch (e) {
          // Ignore grep errors
        }
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

checkVideoIntegrity().catch(console.error); 