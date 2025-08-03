import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VideoInfo {
  filename: string;
  fileSize: number;
  duration?: string;
  codec?: string;
  resolution?: string;
  bitrate?: string;
  hasVideo: boolean;
  hasAudio: boolean;
  error?: string;
}

/**
 * Analyze downloaded video files for codec and integrity issues
 */
async function analyzeVideoFiles() {
  const videosDir = 'downloads/Videos';
  
  console.log('🔍 Analyzing downloaded video files...\n');
  
  try {
    const files = readdirSync(videosDir);
    const videoFiles = files.filter(file => file.endsWith('.mp4'));
    
    console.log(`📁 Found ${videoFiles.length} video files\n`);
    
    const results: VideoInfo[] = [];
    
    for (const file of videoFiles) {
      const filePath = join(videosDir, file);
      const stats = statSync(filePath);
      
      console.log(`🎥 Analyzing: ${file}`);
      
      const videoInfo: VideoInfo = {
        filename: file,
        fileSize: stats.size,
        hasVideo: false,
        hasAudio: false
      };
      
      try {
        // Use ffprobe to get video information
        const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
        const probeData = JSON.parse(stdout);
        
        // Check for video and audio streams
        const videoStreams = probeData.streams?.filter((s: any) => s.codec_type === 'video') || [];
        const audioStreams = probeData.streams?.filter((s: any) => s.codec_type === 'audio') || [];
        
        videoInfo.hasVideo = videoStreams.length > 0;
        videoInfo.hasAudio = audioStreams.length > 0;
        
        if (videoStreams.length > 0) {
          const videoStream = videoStreams[0];
          videoInfo.codec = videoStream.codec_name;
          videoInfo.resolution = `${videoStream.width}x${videoStream.height}`;
          videoInfo.duration = probeData.format?.duration;
          videoInfo.bitrate = probeData.format?.bit_rate;
        }
        
        console.log(`   ✅ Size: ${formatFileSize(stats.size)}`);
        console.log(`   📹 Video: ${videoInfo.hasVideo ? 'Yes' : 'No'} ${videoInfo.codec ? `(${videoInfo.codec})` : ''}`);
        console.log(`   🔊 Audio: ${videoInfo.hasAudio ? 'Yes' : 'No'}`);
        if (videoInfo.resolution) console.log(`   📐 Resolution: ${videoInfo.resolution}`);
        if (videoInfo.duration) console.log(`   ⏱️  Duration: ${parseFloat(videoInfo.duration).toFixed(1)}s`);
        if (videoInfo.bitrate) console.log(`   📊 Bitrate: ${(parseInt(videoInfo.bitrate) / 1000).toFixed(0)}kbps`);
        
      } catch (error: any) {
        videoInfo.error = error.message;
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      results.push(videoInfo);
      console.log('');
    }
    
    // Summary
    console.log('📊 Analysis Summary:');
    console.log(`✅ Total files: ${results.length}`);
    console.log(`✅ Files with video: ${results.filter(r => r.hasVideo).length}`);
    console.log(`✅ Files with audio: ${results.filter(r => r.hasAudio).length}`);
    console.log(`❌ Files with errors: ${results.filter(r => r.error).length}`);
    
    // Check for common issues
    const issues = [];
    
    // Check for double .mp4 extension
    const doubleExtension = results.filter(r => r.filename.includes('.mp4.mp4'));
    if (doubleExtension.length > 0) {
      issues.push(`Double .mp4 extension found in ${doubleExtension.length} files`);
    }
    
    // Check for files without video streams
    const noVideo = results.filter(r => !r.hasVideo);
    if (noVideo.length > 0) {
      issues.push(`${noVideo.length} files have no video stream`);
    }
    
    // Check for very small files (likely corrupted)
    const smallFiles = results.filter(r => r.fileSize < 100000); // Less than 100KB
    if (smallFiles.length > 0) {
      issues.push(`${smallFiles.length} files are very small (< 100KB) - likely corrupted`);
    }
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('\n✅ No obvious issues found');
    }
    
    // Show codec distribution
    const codecs = results.filter(r => r.codec).map(r => r.codec!);
    const codecCount = codecs.reduce((acc, codec) => {
      acc[codec] = (acc[codec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n🎬 Codec Distribution:');
    Object.entries(codecCount).forEach(([codec, count]) => {
      console.log(`   ${codec}: ${count} files`);
    });
    
  } catch (error) {
    console.error('💥 Error analyzing videos:', error);
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the analysis
analyzeVideoFiles().catch(console.error); 