/**
 * Export Firefox reddit.com cookies for BoostLite (Android).
 *
 * Usage:
 *   npm run export-android-cookie
 *   npm run export-android-cookie -- --out ~/Downloads/boostlite-reddit-cookies.txt
 *   npm run export-android-cookie -- --browser firefox
 *
 * Close Firefox completely before running so yt-dlp can read the profile.
 */

import { exportAndroidCookieFile } from '../services/exportAndroidCookies';

function parseArgs(argv: string[]): { out?: string; browser?: string } {
  const out: { out?: string; browser?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out' || arg === '-o') {
      out.out = argv[++i];
    } else if (arg.startsWith('--out=')) {
      out.out = arg.slice('--out='.length);
    } else if (arg === '--browser' || arg === '-b') {
      out.browser = argv[++i];
    } else if (arg.startsWith('--browser=')) {
      out.browser = arg.slice('--browser='.length);
    }
  }
  return out;
}

function main(): void {
  console.log('\n⚠️  Close Firefox completely before exporting so yt-dlp can read cookies.\n');

  const args = parseArgs(process.argv.slice(2));
  const result = exportAndroidCookieFile(args);

  console.log(`✅ Exported ${result.cookieCount} reddit.com cookies from ${result.browser}`);
  console.log(`📄 ${result.path}`);
  console.log('\nNext:');
  console.log('  • AirDrop / USB copy that file to your phone, then BoostLite → Settings → Import file');
  console.log('  • Or: make android-cookie-push   (needs adb + USB debugging)\n');
}

main();
