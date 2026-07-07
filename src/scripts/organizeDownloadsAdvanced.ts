import { runOrganizeByPattern } from '../repair/organizeByPattern';

async function organizeDownloadsAdvanced(): Promise<void> {
  console.log('📁 Advanced organization of downloaded files...\n');

  const summary = runOrganizeByPattern({ dryRun: false });

  console.log('\n📊 Advanced Organization Summary:');
  console.log(`   Total files processed: ${summary.totalFiles}`);
  console.log(`   Files organized: ${summary.organizedFiles}`);
  console.log(`   Groups created: ${summary.groupsCreated}`);

  if (summary.groups.length > 0) {
    console.log('\n📁 Groups created:');
    for (const group of summary.groups) {
      console.log(`   ${group.folderName}/ (${group.files.length} files) - Pattern: ${group.pattern}`);
    }
  }

  console.log('\n✨ Advanced organization complete!');
}

organizeDownloadsAdvanced().catch(console.error);

export { organizeDownloadsAdvanced };
