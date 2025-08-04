import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

class MediaExtractionTester {
  private userAgent = 'RedditSaverApp/1.0.0 (by /u/reddit_user)';

  /**
   * Test 1: Check if video URLs file exists and can be loaded
   */
  async testVideoUrlsLoading(): Promise<TestResult> {
    try {
      const videoFile = 'extracted_files/all-extracted-video-urls.txt';
      
      if (!existsSync(videoFile)) {
        return {
          test: 'Video URLs Loading',
          success: false,
          message: `Video URLs file not found: ${videoFile}`
        };
      }
      
      const content = readFileSync(videoFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      return {
        test: 'Video URLs Loading',
        success: true,
        message: `Successfully loaded ${lines.length} video URLs to exclude`,
        data: { videoUrlCount: lines.length }
      };
    } catch (error) {
      return {
        test: 'Video URLs Loading',
        success: false,
        message: `Error loading video URLs: ${error}`
      };
    }
  }

  /**
   * Test 2: Check if CSV files exist and can be read
   */
  async testCsvFilesLoading(): Promise<TestResult> {
    try {
      const redditLinksDir = 'reddit-links';
      
      if (!existsSync(redditLinksDir)) {
        return {
          test: 'CSV Files Loading',
          success: false,
          message: `Reddit links directory not found: ${redditLinksDir}`
        };
      }
      
      const { readdirSync } = await import('fs');
      const files = readdirSync(redditLinksDir).filter(file => file.endsWith('.csv'));
      
      if (files.length === 0) {
        return {
          test: 'CSV Files Loading',
          success: false,
          message: `No CSV files found in ${redditLinksDir}/`
        };
      }
      
      let totalPosts = 0;
      for (const file of files) {
        const filePath = join(redditLinksDir, file);
        const content = readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const dataLines = lines[0].includes('id') || lines[0].includes('url') ? lines.slice(1) : lines;
        totalPosts += dataLines.length;
      }
      
      return {
        test: 'CSV Files Loading',
        success: true,
        message: `Found ${files.length} CSV files with ${totalPosts} total posts`,
        data: { fileCount: files.length, totalPosts }
      };
    } catch (error) {
      return {
        test: 'CSV Files Loading',
        success: false,
        message: `Error loading CSV files: ${error}`
      };
    }
  }

  /**
   * Test 3: Test media type detection
   */
  async testMediaTypeDetection(): Promise<TestResult> {
    try {
      const testUrls = [
        { url: 'https://i.redd.it/example.jpg', expected: 'image' },
        { url: 'https://i.imgur.com/example.png', expected: 'image' },
        { url: 'https://gfycat.com/example', expected: 'gif' },
        { url: 'https://example.com/image.gif', expected: 'gif' },
        { url: 'https://reddit.com/r/subreddit/comments/123/title/', expected: 'text' },
        { url: 'https://v.redd.it/example.mp4', expected: 'video' },
        { url: 'https://redgifs.com/watch/example', expected: 'video' }
      ];
      
      const results = testUrls.map(({ url, expected }) => {
        const detected = this.detectMediaType(url);
        const isVideo = this.isVideoUrl(url);
        return {
          url,
          expected,
          detected,
          isVideo,
          correct: expected === detected || (expected === 'video' && isVideo)
        };
      });
      
      const correctCount = results.filter(r => r.correct).length;
      const success = correctCount === testUrls.length;
      
      return {
        test: 'Media Type Detection',
        success,
        message: `${correctCount}/${testUrls.length} media type detections correct`,
        data: { results }
      };
    } catch (error) {
      return {
        test: 'Media Type Detection',
        success: false,
        message: `Error testing media type detection: ${error}`
      };
    }
  }

  /**
   * Test 4: Test a single Reddit post extraction (if possible)
   */
  async testSinglePostExtraction(): Promise<TestResult> {
    try {
      // Create a test post with a known Reddit URL
      const testPost = {
        url: 'https://www.reddit.com/r/test/comments/123/test_post/',
        title: 'Test Post',
        subreddit: 'test',
        author: 'testuser'
      };
      
      // Try to extract media URLs (this might fail if the URL doesn't exist)
      const result = await this.extractMediaUrlsFromPost(testPost);
      
      return {
        test: 'Single Post Extraction',
        success: result.success,
        message: result.success 
          ? `Successfully extracted ${result.mediaUrls.length} media URLs`
          : `Failed to extract: ${result.error}`,
        data: { mediaUrlCount: result.mediaUrls.length, error: result.error }
      };
    } catch (error) {
      return {
        test: 'Single Post Extraction',
        success: false,
        message: `Error testing single post extraction: ${error}`
      };
    }
  }

  /**
   * Detect media type from URL
   */
  private detectMediaType(url: string): 'image' | 'gif' | 'text' {
    if (url.includes('.gif') || url.includes('gfycat.com')) {
      return 'gif';
    }
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || 
        url.includes('.webp') || url.includes('i.redd.it') || url.includes('i.imgur.com')) {
      return 'image';
    }
    return 'text';
  }

  /**
   * Check if URL is a video (to exclude)
   */
  private isVideoUrl(url: string): boolean {
    return url.includes('v.redd.it') || 
           url.includes('redgifs.com') ||
           url.includes('.mp4') ||
           url.includes('.webm') ||
           url.includes('.mov');
  }

  /**
   * Extract media URLs from a Reddit post (simplified version)
   */
  private async extractMediaUrlsFromPost(post: any): Promise<{ success: boolean; mediaUrls: string[]; error?: string }> {
    try {
      const response = await axios.get(post.url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });

      const html = response.data;
      const mediaUrls: string[] = [];
      
      // Extract URLs from the HTML
      const urlMatches = html.match(/https?:\/\/[^\s"']+/g) || [];
      
      for (const url of urlMatches) {
        if (!this.isVideoUrl(url) && this.detectMediaType(url) !== 'text') {
          mediaUrls.push(url);
        }
      }
      
      return {
        success: true,
        mediaUrls: [...new Set(mediaUrls)]
      };
      
    } catch (error) {
      return {
        success: false,
        mediaUrls: [],
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Media Extraction Tests...\n');
    
    const tests = [
      this.testVideoUrlsLoading(),
      this.testCsvFilesLoading(),
      this.testMediaTypeDetection(),
      this.testSinglePostExtraction()
    ];
    
    const results = await Promise.all(tests);
    
    console.log('📊 Test Results:\n');
    
    let passedTests = 0;
    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.message}`);
      
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
      }
      
      if (result.success) {
        passedTests++;
      }
      
      console.log('');
    }
    
    console.log(`🎯 Overall Result: ${passedTests}/${results.length} tests passed`);
    
    if (passedTests === results.length) {
      console.log('🎉 All tests passed! Media extraction functionality is ready.');
    } else {
      console.log('⚠️  Some tests failed. Please check the issues above.');
    }
  }
}

async function main() {
  const tester = new MediaExtractionTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Error running tests:', error);
  }
}

// Run the main function
main(); 