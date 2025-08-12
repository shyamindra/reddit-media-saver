import { ContentDownloadService } from '../services/contentDownloadService';

/**
 * Recovery script to download videos from extracted URLs
 * Generated on 2025-08-03T21:11:23.382Z
 */
async function recoverVideos() {
  console.log('🎬 Starting video recovery process...\n');
  
  const downloadService = new ContentDownloadService('downloads/Videos');
  
  const videoUrls = [
    'https://media.redgifs.com/BulkyUnusualSkink.mp4',
    'https://v.redd.it/v1ziu9jpk60b1',
    'https://v.redd.it/v1ziu9jpk60b1/DASH_96.mp4',
    'https://packaged-media.redd.it/v1ziu9jpk60b1/pb/m2-res_220p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=d75f4a32b045be10897c48c5a8705fddd8591dd3',
    'https://packaged-media.redd.it/v1ziu9jpk60b1/pb/m2-res_240p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=fa1de4a2d2692e214e390affc30a8d857d474188',
    'https://packaged-media.redd.it/v1ziu9jpk60b1/pb/m2-res_360p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=c1392d85bdbb8d2ba69f0cfba1b4ab8783013778',
    'https://packaged-media.redd.it/v1ziu9jpk60b1/pb/m2-res_480p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=53e9a8aa408dc6bfe887af195432f553bba3152f',
    'https://packaged-media.redd.it/v1ziu9jpk60b1/pb/m2-res_720p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=b5d961f0e95976122af6c8891ad9f6daab892520',
    'https://packaged-media.redd.it/v1ziu9jpk60b1/pb/m2-res_1080p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=019ec136b7c13c83cefb4c762d0d583e6132b432',
    'https://packaged-media.redd.it/v1ziu9jpk60b1/pb/m2-res_220p.mp4',
    'https://packaged-media.redd.it/v1ziu9jpk60b1/pb/m2-res_240p.mp4',
    'https://packaged-media.redd.it/v1ziu9jpk60b1/pb/m2-res_360p.mp4',
    'https://packaged-media.redd.it/v1ziu9jpk60b1/pb/m2-res_480p.mp4',
    'https://packaged-media.redd.it/v1ziu9jpk60b1/pb/m2-res_720p.mp4',
    'https://packaged-media.redd.it/v1ziu9jpk60b1/pb/m2-res_1080p.mp4',
    'https://media.redgifs.com/NegligibleConcreteCockroach-silent.mp4',
    'https://media.redgifs.com/KeyBrokenGiraffe-silent.mp4',
    'https://media.redgifs.com/RepulsiveSiennaGoitered.mp4',
    'https://media.redgifs.com/RubberyGiftedKentrosaurus-silent.mp4',
    'https://media.redgifs.com/QuerulousFaroffBunny-silent.mp4',
    'https://v.redd.it/9lo90g0nkoxa1',
    'https://v.redd.it/9lo90g0nkoxa1/DASH_96.mp4',
    'https://packaged-media.redd.it/9lo90g0nkoxa1/pb/m2-res_220p.mp4?m=DASHPlaylist.mpd&v=1&e=1754265600&s=764cdccdb9146e8265fe9e20e859cb256abf129e',
    'https://packaged-media.redd.it/9lo90g0nkoxa1/pb/m2-res_240p.mp4?m=DASHPlaylist.mpd&v=1&e=1754265600&s=6cef99105b2bc048bfd4492b2fe908f8f183a2d6',
    'https://packaged-media.redd.it/9lo90g0nkoxa1/pb/m2-res_360p.mp4?m=DASHPlaylist.mpd&v=1&e=1754265600&s=0740f628b5de1d0f7aaba897af0f411a80ddb819',
    'https://packaged-media.redd.it/9lo90g0nkoxa1/pb/m2-res_480p.mp4?m=DASHPlaylist.mpd&v=1&e=1754265600&s=9c4d37d9630be8534f4d4e937e213b74c61a80b7',
    'https://packaged-media.redd.it/9lo90g0nkoxa1/pb/m2-res_720p.mp4?m=DASHPlaylist.mpd&v=1&e=1754265600&s=52181b551cb909d01c396986d9fe7646e0b221ab',
    'https://packaged-media.redd.it/9lo90g0nkoxa1/pb/m2-res_220p.mp4',
    'https://packaged-media.redd.it/9lo90g0nkoxa1/pb/m2-res_240p.mp4',
    'https://packaged-media.redd.it/9lo90g0nkoxa1/pb/m2-res_360p.mp4',
    'https://packaged-media.redd.it/9lo90g0nkoxa1/pb/m2-res_480p.mp4',
    'https://packaged-media.redd.it/9lo90g0nkoxa1/pb/m2-res_720p.mp4',
    'https://media.redgifs.com/AngelicHelpfulVixen-silent.mp4',
    'https://media.redgifs.com/FloralwhiteDamagedBear-silent.mp4',
    'https://v.redd.it/zy818tddnxcb1',
    'https://v.redd.it/zy818tddnxcb1/DASH_96.mp4',
    'https://v.redd.it/yugi4ionefgb1',
    'https://v.redd.it/yugi4ionefgb1/DASH_96.mp4',
    'https://packaged-media.redd.it/yugi4ionefgb1/pb/m2-res_258p.mp4?m=DASHPlaylist.mpd&v=1&e=1754262000&s=4c722868c45294bc5fbe8fd7c8ae1cba5890b198',
    'https://packaged-media.redd.it/yugi4ionefgb1/pb/m2-res_316p.mp4?m=DASHPlaylist.mpd&v=1&e=1754262000&s=b8e5a3f8b258102a42430eb6cb0ee171021a1335',
    'https://packaged-media.redd.it/yugi4ionefgb1/pb/m2-res_422p.mp4?m=DASHPlaylist.mpd&v=1&e=1754262000&s=aa4b37ecdd4e0783b8ce0692fd015f43bf5b1e53',
    'https://packaged-media.redd.it/yugi4ionefgb1/pb/m2-res_562p.mp4?m=DASHPlaylist.mpd&v=1&e=1754262000&s=11e711857f65724ef3b9ff1fcabd72bf7a09fb58',
    'https://packaged-media.redd.it/yugi4ionefgb1/pb/m2-res_258p.mp4',
    'https://packaged-media.redd.it/yugi4ionefgb1/pb/m2-res_316p.mp4',
    'https://packaged-media.redd.it/yugi4ionefgb1/pb/m2-res_422p.mp4',
    'https://packaged-media.redd.it/yugi4ionefgb1/pb/m2-res_562p.mp4',
    'https://media.redgifs.com/IndigoBigRainbowfish-silent.mp4',
    'https://v.redd.it/y8jijmwmid0b1',
    'https://v.redd.it/y8jijmwmid0b1/DASH_96.mp4',
    'https://media.redgifs.com/MixedWiseGroundbeetle.mp4',
    'https://media.redgifs.com/SatisfiedShadowyLemming.mp4',
    'https://media.redgifs.com/LikelyAntiqueHylaeosaurus-silent.mp4',
    'https://v.redd.it/38mtxxiwgqsa1',
    'https://v.redd.it/38mtxxiwgqsa1/DASH_96.mp4',
    'https://v.redd.it/nnrlfj0335ob1',
    'https://v.redd.it/nnrlfj0335ob1/DASH_96.mp4',
    'https://media.redgifs.com/LinearThoughtfulElectriceel.mp4',
    'https://v.redd.it/gv6590lr5pgf1',
    'https://v.redd.it/gv6590lr5pgf1/DASH_96.mp4',
    'https://packaged-media.redd.it/gv6590lr5pgf1/pb/m2-res_392p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=8bb6ddc727f0eeeda9d7ec9ab533fd8bebac29cc',
    'https://packaged-media.redd.it/gv6590lr5pgf1/pb/m2-res_480p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=a6ce6b48f1b4fd12af460f876c7e81aeb41cd7ec',
    'https://packaged-media.redd.it/gv6590lr5pgf1/pb/m2-res_640p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=b3baa4ff5df7e286feece8ad1dd559b25df8ec57',
    'https://packaged-media.redd.it/gv6590lr5pgf1/pb/m2-res_392p.mp4',
    'https://packaged-media.redd.it/gv6590lr5pgf1/pb/m2-res_480p.mp4',
    'https://packaged-media.redd.it/gv6590lr5pgf1/pb/m2-res_640p.mp4',
    'https://v.redd.it/an16trqes7sa1',
    'https://v.redd.it/an16trqes7sa1/DASH_96.mp4',
    'https://v.redd.it/cgcpjpjman2b1',
    'https://v.redd.it/5a7saxgb381b1',
    'https://v.redd.it/5a7saxgb381b1/DASH_96.mp4',
    'https://media.redgifs.com/PrestigiousTediousArizonaalligatorlizard-silent.mp4',
    'https://v.redd.it/a315earp8oib1',
    'https://v.redd.it/a315earp8oib1/DASH_96.mp4',
    'https://v.redd.it/38d1o3w3hk9b1',
    'https://v.redd.it/38d1o3w3hk9b1/DASH_96.mp4',
    'https://v.redd.it/gv0hpz7ehk9b1',
    'https://v.redd.it/gv0hpz7ehk9b1/DASH_96.mp4',
    'https://v.redd.it/rasdudv9diib1',
    'https://v.redd.it/rasdudv9diib1/DASH_96.mp4',
    'https://packaged-media.redd.it/rasdudv9diib1/pb/m2-res_220p.mp4?m=DASHPlaylist.mpd&v=1&e=1754272800&s=02bfcba923f4525e5ec8212cfb3ed504b99de501',
    'https://packaged-media.redd.it/rasdudv9diib1/pb/m2-res_270p.mp4?m=DASHPlaylist.mpd&v=1&e=1754272800&s=ebc8285e5751693ab8e7b7a86bc3c48e952fe0fe',
    'https://packaged-media.redd.it/rasdudv9diib1/pb/m2-res_360p.mp4?m=DASHPlaylist.mpd&v=1&e=1754272800&s=51735ad5701b68b10a51ed0a8d9f16733b0d0a9d',
    'https://packaged-media.redd.it/rasdudv9diib1/pb/m2-res_480p.mp4?m=DASHPlaylist.mpd&v=1&e=1754272800&s=a7c97bc582835a5f29e12f35d119f1511e9486f1',
    'https://packaged-media.redd.it/rasdudv9diib1/pb/m2-res_720p.mp4?m=DASHPlaylist.mpd&v=1&e=1754272800&s=d26db5c3c40229c2fbab37d28c7adfc6f499b832',
    'https://packaged-media.redd.it/rasdudv9diib1/pb/m2-res_1080p.mp4?m=DASHPlaylist.mpd&v=1&e=1754272800&s=ab33cf91158ac0d645e0a6dd212b52d8b7f3fb39',
    'https://packaged-media.redd.it/rasdudv9diib1/pb/m2-res_220p.mp4',
    'https://packaged-media.redd.it/rasdudv9diib1/pb/m2-res_270p.mp4',
    'https://packaged-media.redd.it/rasdudv9diib1/pb/m2-res_360p.mp4',
    'https://packaged-media.redd.it/rasdudv9diib1/pb/m2-res_480p.mp4',
    'https://packaged-media.redd.it/rasdudv9diib1/pb/m2-res_720p.mp4',
    'https://packaged-media.redd.it/rasdudv9diib1/pb/m2-res_1080p.mp4',
    'https://v.redd.it/n73g9pv8l9ib1',
    'https://v.redd.it/n73g9pv8l9ib1/DASH_96.mp4',
    'https://v.redd.it/f7jx9nmfdssa1',
    'https://v.redd.it/f7jx9nmfdssa1/DASH_96.mp4',
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_220p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=8961b706b3b6381897ecb8c27735f1e57060dcf3',
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_240p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=c2feed1cab5ca959fba513d0a910537d2dd8fd3c',
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_360p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=ee2563c6e41765f44c48fa774801e534e8c096ba',
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_480p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=86b6ac1be5aa7c8286c4c9499ec374308cac9255',
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_720p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=094e735307873b56a102879036b7c1874acb66bf',
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_1080p.mp4?m=DASHPlaylist.mpd&v=1&e=1754269200&s=e8e7427fc082cd66d9ccaf7c4de084e8e39c93b8',
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_220p.mp4',
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_240p.mp4',
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_360p.mp4',
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_480p.mp4',
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_720p.mp4',
    'https://packaged-media.redd.it/f7jx9nmfdssa1/pb/m2-res_1080p.mp4',
    'https://v.redd.it/i15uism8oi1b1',
    'https://v.redd.it/i15uism8oi1b1/DASH_96.mp4',
    'https://media.redgifs.com/HandySimplisticKittiwake-silent.mp4',
    'https://v.redd.it/1o8mwr0oun9b1',
    'https://v.redd.it/1o8mwr0oun9b1/DASH_96.mp4',
    'https://media.redgifs.com/BiodegradableThreadbareWuerhosaurus.mp4',
    'https://media.redgifs.com/InsignificantFrontAnchovy.mp4',
    'https://v.redd.it/qnpcdfpt6vdb1',
    'https://v.redd.it/qnpcdfpt6vdb1/DASH_96.mp4'
  ];
  
  console.log(`📊 Found ${videoUrls.length} video URLs to download\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    console.log(`[${i + 1}/${videoUrls.length}] Downloading: ${url}`);
    
    try {
      const result = await downloadService.downloadMedia(url, `Recovered_Video_${i + 1}`, 'recovered');
      
      if (result.success) {
        console.log(`✅ Success: ${result.filePath}`);
        successCount++;
      } else {
        console.log(`❌ Failed: ${result.error}`);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ Error: ${error}`);
      failCount++;
    }
    
    // Add delay between downloads
    if (i < videoUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n📊 Recovery Summary:`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total: ${videoUrls.length}`);
}

// Run the recovery
recoverVideos().catch(console.error);
