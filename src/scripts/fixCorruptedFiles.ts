import { runFixCorrupt } from '../repair/fixCorrupt';

async function main(): Promise<void> {
  console.log('🔍 Scanning for corrupted image files...\n');
  const summary = runFixCorrupt();
  console.log(`\n✅ Total files fixed: ${summary.fixed}`);
  if (summary.fixed === 0) {
    console.log('🎉 No corrupted files found!');
  }
}

main().catch(console.error);

export default main;
