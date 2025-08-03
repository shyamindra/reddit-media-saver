const { build } = require('esbuild');
const { copy } = require('fs-extra');
const path = require('path');
const fs = require('fs');

async function buildElectron() {
  try {
    console.log('🔨 Starting Electron build process...');
    
    // Ensure dist-electron directory exists
    const distDir = 'dist-electron';
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
      console.log('📁 Created dist-electron directory');
    }

    // Build main process
    console.log('📦 Building main process...');
    await build({
      entryPoints: ['src/main.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outfile: 'dist-electron/main.js',
      external: ['electron'],
      format: 'esm',
      sourcemap: true,
      minify: false, // Keep readable for debugging
      define: {
        'process.env.NODE_ENV': '"development"',
      },
    });
    console.log('✅ Main process built successfully');

    // Build preload script
    console.log('📦 Building preload script...');
    await build({
      entryPoints: ['src/preload.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outfile: 'dist-electron/preload.js',
      external: ['electron'],
      format: 'esm',
      sourcemap: true,
      minify: false, // Keep readable for debugging
      define: {
        'process.env.NODE_ENV': '"development"',
      },
    });
    console.log('✅ Preload script built successfully');

    // Copy any additional assets if needed
    console.log('📋 Copying additional assets...');
    if (fs.existsSync('public')) {
      await copy('public', 'dist-electron/public');
      console.log('✅ Public assets copied');
    }

    console.log('🎉 Electron build completed successfully!');
    console.log('📁 Output directory: dist-electron/');
    
    // List built files
    const files = fs.readdirSync(distDir);
    console.log('📄 Built files:', files.join(', '));
    
  } catch (error) {
    console.error('❌ Electron build failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

buildElectron(); 