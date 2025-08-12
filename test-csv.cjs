const fs = require('fs');
const path = require('path');

// Simple test to check if CSV files exist and can be read
console.log('🔍 Testing CSV download functionality...\n');

// Check if reddit-links directory exists
const redditLinksDir = path.join(process.cwd(), 'reddit-links');
if (!fs.existsSync(redditLinksDir)) {
  console.log('❌ reddit-links directory not found');
  process.exit(1);
}

// List CSV files
const csvFiles = fs.readdirSync(redditLinksDir)
  .filter(file => file.toLowerCase().endsWith('.csv'));

console.log(`📁 Found ${csvFiles.length} CSV files in reddit-links/`);

// Read and parse sample CSV
if (csvFiles.length > 0) {
  const sampleFile = path.join(redditLinksDir, csvFiles[0]);
  console.log(`📄 Reading sample file: ${csvFiles[0]}`);
  
  const content = fs.readFileSync(sampleFile, 'utf-8');
  const lines = content.split('\n');
  const urls = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
      continue;
    }
    
    const columns = trimmedLine.split(',').map(col => col.trim());
    if (columns.length >= 2) {
      const url = columns[1];
      if (url && url.length > 0) {
        urls.push(url);
      }
    }
  }
  
  console.log(`✅ Found ${urls.length} URLs in ${csvFiles[0]}`);
  
  if (urls.length > 0) {
    console.log('\n📋 Sample URLs:');
    urls.slice(0, 3).forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`);
    });
  }
}

// Check if downloads directory exists
const downloadsDir = path.join(process.cwd(), 'downloads');
if (!fs.existsSync(downloadsDir)) {
  console.log('\n📁 Creating downloads directory...');
  fs.mkdirSync(downloadsDir, { recursive: true });
  console.log('✅ Downloads directory created');
} else {
  console.log('\n✅ Downloads directory exists');
}

console.log('\n✨ CSV functionality test complete!');
console.log('📝 The CSV system appears to be ready for use.'); 