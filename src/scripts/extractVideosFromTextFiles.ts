import { runRecoverHtml } from '../repair/recoverHtml';

async function main(): Promise<void> {
  console.log('🔍 Starting video extraction from text files...\n');
  const summary = await runRecoverHtml();
  console.log('\n📊 Summary');
  console.log(`   Files processed: ${summary.filesProcessed}`);
  console.log(`   Video URLs found: ${summary.urlsFound}`);
  console.log(`   Videos downloaded: ${summary.downloaded}`);
}

main().catch(console.error);

export { main };
