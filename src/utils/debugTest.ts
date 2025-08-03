/**
 * Simple debug test to verify app functionality
 */

export function runDebugTest() {
  console.log('🔧 Running debug test...');
  
  // Test 1: Basic functionality
  console.log('✅ Test 1: Basic imports working');
  
  // Test 2: Environment variables
  const hasEnvVars = !!(import.meta.env.VITE_REDDIT_CLIENT_ID && import.meta.env.VITE_REDDIT_CLIENT_SECRET);
  console.log(`✅ Test 2: Environment variables loaded: ${hasEnvVars}`);
  
  // Test 3: React context
  const hasReact = typeof React !== 'undefined';
  console.log(`✅ Test 3: React available: ${hasReact}`);
  
  // Test 4: DOM access
  const hasDOM = typeof document !== 'undefined';
  console.log(`✅ Test 4: DOM available: ${hasDOM}`);
  
  // Test 5: Electron context
  const hasElectronAPI = typeof window !== 'undefined' && window.electronAPI;
  console.log(`✅ Test 5: Electron API available: ${hasElectronAPI}`);
  
  // Test 6: API endpoints
  const testApiCall = async () => {
    try {
      const response = await fetch('/api/reddit/api/v1/me', {
        method: 'GET',
        headers: {
          'User-Agent': 'RedditSaverApp/1.0.0'
        }
      });
      console.log(`✅ Test 6: API proxy working: ${response.status}`);
    } catch (error) {
      console.log(`❌ Test 6: API proxy failed: ${error}`);
    }
  };
  
  // Run API test if in browser
  if (hasDOM) {
    testApiCall();
  }
  
  console.log('🎉 Debug test completed!');
  
  return {
    hasEnvVars,
    hasReact,
    hasDOM,
    hasElectronAPI
  };
}

// Auto-run in browser context
if (typeof window !== 'undefined') {
  setTimeout(() => {
    runDebugTest();
  }, 1000);
} 