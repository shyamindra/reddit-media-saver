const { build } = require('esbuild');
const { copy } = require('fs-extra');
const path = require('path');

async function buildElectron() {
  try {
    // Build main process
    await build({
      entryPoints: ['src/main.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outfile: 'dist-electron/main.js',
      external: ['electron'],
      format: 'esm',
      sourcemap: true,
    });

    // Build preload script
    await build({
      entryPoints: ['src/preload.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outfile: 'dist-electron/preload.js',
      external: ['electron'],
      format: 'esm',
      sourcemap: true,
    });

    console.log('✅ Electron build completed successfully');
  } catch (error) {
    console.error('❌ Electron build failed:', error);
    process.exit(1);
  }
}

buildElectron(); 