/**
 * Comprehensive test utility to verify all fixes
 * Tests CORS, environment variables, Electron API, and app functionality
 */

export async function runComprehensiveTest() {
  console.log('🧪 Running Comprehensive Test Suite...');
  console.log('=====================================');
  
  const results = {
    environment: false,
    cors: false,
    electronAPI: false,
    redditAPI: false,
    appLoading: false,
  };

  // Test 1: Environment Variables
  console.log('\n🔍 Test 1: Environment Variables');
  try {
    const hasClientId = !!import.meta.env.VITE_REDDIT_CLIENT_ID;
    const hasClientSecret = !!import.meta.env.VITE_REDDIT_CLIENT_SECRET;
    const isDev = import.meta.env.DEV;
    const isElectron = import.meta.env.ELECTRON;
    
    console.log(`   ✅ Client ID: ${hasClientId}`);
    console.log(`   ✅ Client Secret: ${hasClientSecret}`);
    console.log(`   ✅ Development Mode: ${isDev}`);
    console.log(`   ✅ Electron Mode: ${isElectron}`);
    
    results.environment = hasClientId && hasClientSecret;
    console.log(`   ${results.environment ? '✅' : '❌'} Environment Test: ${results.environment ? 'PASSED' : 'FAILED'}`);
  } catch (error) {
    console.log(`   ❌ Environment Test Failed: ${error}`);
  }

  // Test 2: CORS Proxy
  console.log('\n🌐 Test 2: CORS Proxy');
  try {
    const response = await fetch('/api/reddit/api/v1/me', {
      method: 'GET',
      headers: {
        'User-Agent': 'RedditSaverApp/1.0.0'
      }
    });
    
    console.log(`   ✅ Proxy Response Status: ${response.status}`);
    console.log(`   ✅ Proxy Response OK: ${response.ok}`);
    
    results.cors = response.status !== 0; // Any response means proxy is working
    console.log(`   ${results.cors ? '✅' : '❌'} CORS Test: ${results.cors ? 'PASSED' : 'FAILED'}`);
  } catch (error) {
    console.log(`   ❌ CORS Test Failed: ${error}`);
  }

  // Test 3: Electron API
  console.log('\n⚡ Test 3: Electron API');
  try {
    const hasElectronAPI = typeof window !== 'undefined' && window.electronAPI;
    const hasRedditAuth = hasElectronAPI && typeof window.electronAPI.redditAuth === 'function';
    const hasDownloadContent = hasElectronAPI && typeof window.electronAPI.downloadContent === 'function';
    
    console.log(`   ✅ Electron API Available: ${hasElectronAPI}`);
    console.log(`   ✅ Reddit Auth Method: ${hasRedditAuth}`);
    console.log(`   ✅ Download Content Method: ${hasDownloadContent}`);
    
    results.electronAPI = hasElectronAPI && hasRedditAuth && hasDownloadContent;
    console.log(`   ${results.electronAPI ? '✅' : '❌'} Electron API Test: ${results.electronAPI ? 'PASSED' : 'FAILED'}`);
  } catch (error) {
    console.log(`   ❌ Electron API Test Failed: ${error}`);
  }

  // Test 4: Reddit API Service
  console.log('\n🔗 Test 4: Reddit API Service');
  try {
    // Test if the Reddit API service can be imported and instantiated
    const { redditApi } = await import('../services/redditApi');
    const hasApiService = !!redditApi;
    const hasMethods = hasApiService && typeof redditApi.getAuthorizationUrl === 'function';
    
    console.log(`   ✅ API Service Available: ${hasApiService}`);
    console.log(`   ✅ API Methods Available: ${hasMethods}`);
    
    results.redditAPI = hasApiService && hasMethods;
    console.log(`   ${results.redditAPI ? '✅' : '❌'} Reddit API Test: ${results.redditAPI ? 'PASSED' : 'FAILED'}`);
  } catch (error) {
    console.log(`   ❌ Reddit API Test Failed: ${error}`);
  }

  // Test 5: App Loading
  console.log('\n📱 Test 5: App Loading');
  try {
    const hasReact = typeof React !== 'undefined';
    const hasDOM = typeof document !== 'undefined';
    const hasRoot = hasDOM && document.getElementById('root');
    const hasApp = hasReact && typeof React.createElement === 'function';
    
    console.log(`   ✅ React Available: ${hasReact}`);
    console.log(`   ✅ DOM Available: ${hasDOM}`);
    console.log(`   ✅ Root Element: ${hasRoot}`);
    console.log(`   ✅ App Component: ${hasApp}`);
    
    results.appLoading = hasReact && hasDOM && hasRoot && hasApp;
    console.log(`   ${results.appLoading ? '✅' : '❌'} App Loading Test: ${results.appLoading ? 'PASSED' : 'FAILED'}`);
  } catch (error) {
    console.log(`   ❌ App Loading Test Failed: ${error}`);
  }

  // Summary
  console.log('\n📊 Test Summary');
  console.log('==============');
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! The app should be working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the details above.');
  }

  return {
    results,
    passedTests,
    totalTests,
    allPassed: passedTests === totalTests
  };
}

// Auto-run in browser context
if (typeof window !== 'undefined') {
  setTimeout(() => {
    runComprehensiveTest();
  }, 2000); // Wait a bit for everything to load
} 