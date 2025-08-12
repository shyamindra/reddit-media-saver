import { EnhancedVideoDownloadService } from '../services/enhancedVideoDownloadService';

/**
 * Test script for enhanced video download service
 */
async function testEnhancedVideoDownload() {
  console.log('🧪 Testing Enhanced Video Download Service...\n');

  // Real Reddit video URLs for testing (from extracted-video-urls.txt)
  const testUrls = [
    // RedGIFs video
    'https://media.redgifs.com/InsignificantFrontAnchovy.mp4',
    // Reddit video
    'https://v.redd.it/qnpcdfpt6vdb1',
    // Packaged media video (720p)
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_720p.mp4',
    // Another RedGIFs video
    'https://media.redgifs.com/BiodegradableThreadbareWuerhosaurus.mp4'
  ];

  const videoService = new EnhancedVideoDownloadService();

  // Test single video download
  console.log('📹 Testing single video download...');
  const singleResult = await videoService.downloadVideo(testUrls[0]);
  console.log('Single video result:', singleResult);

  // Test multiple video downloads (limit to 2 for testing)
  console.log('\n📹 Testing multiple video downloads...');
  const batchResult = await videoService.processVideoUrls(testUrls.slice(0, 2));
  console.log('Batch result:', batchResult);

  console.log('\n✅ Enhanced video download test complete!');
}

// Run the test
testEnhancedVideoDownload().catch(console.error);

export { testEnhancedVideoDownload }; 