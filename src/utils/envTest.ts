/**
 * Environment variable test utility
 * Helps debug environment variable loading issues
 */

export function testEnvironmentVariables() {
  const envVars = {
    // Vite environment variables
    VITE_REDDIT_CLIENT_ID: import.meta.env.VITE_REDDIT_CLIENT_ID,
    VITE_REDDIT_CLIENT_SECRET: import.meta.env.VITE_REDDIT_CLIENT_SECRET,
    VITE_REDDIT_REDIRECT_URI: import.meta.env.VITE_REDDIT_REDIRECT_URI,
    VITE_DEV_SERVER_URL: import.meta.env.VITE_DEV_SERVER_URL,
    
    // Node environment variables (available in Electron main process)
    NODE_ENV: import.meta.env.NODE_ENV,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    
    // Electron specific
    ELECTRON: import.meta.env.ELECTRON,
  };

  console.log('🔍 Environment Variables Test:');
  console.log('==============================');
  
  Object.entries(envVars).forEach(([key, value]) => {
    const hasValue = !!value;
    const displayValue = hasValue ? (key.includes('SECRET') ? '[HIDDEN]' : value) : '[NOT SET]';
    console.log(`${hasValue ? '✅' : '❌'} ${key}: ${displayValue}`);
  });

  // Test Reddit API configuration
  const hasRedditConfig = !!(envVars.VITE_REDDIT_CLIENT_ID && envVars.VITE_REDDIT_CLIENT_SECRET);
  console.log('\n🔐 Reddit API Configuration:');
  console.log(`   ${hasRedditConfig ? '✅' : '❌'} Credentials configured: ${hasRedditConfig}`);
  
  if (hasRedditConfig) {
    console.log('   ✅ App should be able to authenticate with Reddit');
  } else {
    console.log('   ❌ App will show credentials setup screen');
  }

  // Test environment context
  console.log('\n🌍 Environment Context:');
  console.log(`   Development: ${envVars.DEV ? '✅' : '❌'}`);
  console.log(`   Production: ${envVars.PROD ? '✅' : '❌'}`);
  console.log(`   Electron: ${envVars.ELECTRON ? '✅' : '❌'}`);

  return {
    hasRedditConfig,
    envVars,
    isElectron: !!envVars.ELECTRON,
    isDev: !!envVars.DEV,
  };
}

// Auto-run test when imported
if (typeof window !== 'undefined') {
  // Browser context
  console.log('🌐 Running in browser context');
  testEnvironmentVariables();
} else {
  // Node/Electron context
  console.log('⚡ Running in Node/Electron context');
} 