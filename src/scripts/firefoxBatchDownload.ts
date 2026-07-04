import { parseCli } from '../cli/parseCli';
import { executeCli } from '../cli/executeCli';
import { getYtdlpVersion, resolveYtdlpBinary } from '../utils/ytdlp';

async function main(): Promise<void> {
  const ytdlpBin = resolveYtdlpBinary();
  console.log('🦊 Firefox Batch Downloader\n');
  console.log(`   yt-dlp:  ${ytdlpBin} (${getYtdlpVersion(ytdlpBin)})`);
  console.log('\n⚠️  Close Firefox before starting so yt-dlp can read your cookies.\n');

  const command = parseCli(['download', ...process.argv.slice(2)]);
  await executeCli(command);

  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export { main };
