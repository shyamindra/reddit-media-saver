import { runFixCorrupt } from '../repair/fixCorrupt';

async function main(): Promise<void> {
  console.log('🔧 Starting corrupted video file fixer...\n');
  const summary = runFixCorrupt();
  console.log(`\n✅ Fixed ${summary.fixed} corrupted file(s)`);
}

main().catch(console.error);

export { main };
