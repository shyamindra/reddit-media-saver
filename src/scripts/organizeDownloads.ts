import { runOrganize } from '../repair/organize';

async function main(): Promise<void> {
  console.log('📁 Organizing downloaded files by similarity...\n');
  const summary = runOrganize();
  console.log('\n📊 Organization Summary');
  console.log(`   Total files processed: ${summary.totalFiles}`);
  console.log(`   Files organized: ${summary.organizedFiles}`);
  console.log(`   Groups created: ${summary.groupsCreated}`);
  console.log('\n✨ Organization complete!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export { main };
