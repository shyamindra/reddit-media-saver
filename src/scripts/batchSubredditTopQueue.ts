import { parseCli } from '../cli/parseCli';
import { executeCli } from '../cli/executeCli';

async function main(): Promise<void> {
  console.log('📋 Subreddit Top Batch Queue\n');
  console.log('\n⚠️  Close Firefox before starting so cookies can be read.\n');

  const command = parseCli(['queue', ...process.argv.slice(2)]);
  await executeCli(command);

  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export { main };
