import { resolveMediaFromPostUrl } from '../src/linkResolution/resolveFromPostUrl';
import { resolvedDirectDownloads } from '../src/linkResolution/resolvePostMedia';

async function probe(url: string): Promise<void> {
  const resolved = resolvedDirectDownloads(await resolveMediaFromPostUrl(url, { useCookies: true, browser: 'firefox' }));
  console.log(`\n=== ${url.split('/comments/')[1]?.slice(0, 40)} ===`);
  if (resolved.length === 0) console.log('  (no direct media resolved)');
  for (const item of resolved) {
    console.log(`  ${item.mediaType.padEnd(6)} ${item.quality?.padEnd(10) ?? ''} ${item.url}`);
  }
}

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error('Usage: npx tsx scripts/probeVideoPosts.ts <reddit-url>...');
  process.exit(1);
}

for (const url of urls) {
  await probe(url);
}
