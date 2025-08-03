import axios from 'axios';

/**
 * Debug script to test Reddit API access
 */
async function testRedditApi() {
  console.log('🔍 Testing Reddit API access...\n');

  // Try to get Reddit's front page to find a real post
  try {
    console.log('📋 Getting Reddit front page...');
    const frontPageResponse = await axios.get('https://www.reddit.com/.json', {
      headers: {
        'User-Agent': 'RedditSaverApp/1.0.0 (by /u/reddit_user)'
      },
      timeout: 10000
    });

    console.log('✅ Front page loaded successfully!');
    
    const posts = frontPageResponse.data?.data?.children;
    if (posts && posts.length > 0) {
      const firstPost = posts[0].data;
      console.log('\n📝 Found a real post:');
      console.log('Title:', firstPost.title);
      console.log('Subreddit:', firstPost.subreddit);
      console.log('Post ID:', firstPost.id);
      console.log('URL:', firstPost.url);
      
      // Test the JSON API for this post
      const postJsonUrl = `https://www.reddit.com/r/${firstPost.subreddit}/comments/${firstPost.id}/.json`;
      console.log('\n🔗 Testing JSON API for this post...');
      console.log('URL:', postJsonUrl);
      
      const postResponse = await axios.get(postJsonUrl, {
        headers: {
          'User-Agent': 'RedditSaverApp/1.0.0 (by /u/reddit_user)'
        },
        timeout: 10000
      });

      console.log('✅ Post JSON API works!');
      console.log('Status:', postResponse.status);
      
      const postData = postResponse.data?.data?.children?.[0]?.data;
      if (postData) {
        console.log('\n📊 Post data:');
        console.log('Title:', postData.title);
        console.log('Subreddit:', postData.subreddit);
        console.log('URL:', postData.url);
        console.log('Selftext length:', postData.selftext?.length || 0);
        console.log('Is media post:', !!postData.url && postData.url !== postData.permalink);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Status text:', error.response?.statusText);
      console.error('Data:', error.response?.data);
    }
  }
}

testRedditApi(); 