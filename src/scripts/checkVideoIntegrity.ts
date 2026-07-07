import { parseCli } from '../cli/parseCli';
import { executeCli } from '../cli/executeCli';

async function main(): Promise<void> {
  const command = parseCli(['repair', 'integrity-scan', ...process.argv.slice(2)]);
  await executeCli(command);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
