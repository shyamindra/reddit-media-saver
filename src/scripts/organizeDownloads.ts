import { readdirSync, mkdirSync, renameSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { FilenameSimilarity } from '../utils/filenameSimilarity';

interface FileInfo {
  name: string;
  path: string;
  fullPath: string;
}

interface OrganizationResult {
  totalFiles: number;
  organizedFiles: number;
  groupsCreated: number;
  groups: Array<{
    folderName: string;
    files: string[];
    similarity: number;
  }>;
}

/**
 * Script to organize downloaded files into subfolders based on filename similarity
 */
async function organizeDownloads() {
  console.log('📁 Organizing downloaded files by similarity...\n');

  const downloadsDir = 'downloads';
  const categories = ['Images', 'Videos', 'Gifs', 'Notes'];
  const results: OrganizationResult = {
    totalFiles: 0,
    organizedFiles: 0,
    groupsCreated: 0,
    groups: []
  };

  for (const category of categories) {
    const categoryPath = join(downloadsDir, category);
    
    if (!existsSync(categoryPath)) {
      console.log(`⚠️  Category ${category} not found, skipping...`);
      continue;
    }

    console.log(`📂 Processing ${category}...`);
    
    try {
      const files = readdirSync(categoryPath);
      const fileInfos: FileInfo[] = files
        .filter(file => !file.startsWith('.')) // Skip hidden files
        .map(file => ({
          name: file,
          path: file,
          fullPath: join(categoryPath, file)
        }));

      if (fileInfos.length === 0) {
        console.log(`   No files found in ${category}`);
        continue;
      }

      console.log(`   Found ${fileInfos.length} files`);

      // Group files by similarity
      const filenames = fileInfos.map(f => f.name);
      
      // Try different similarity thresholds
      let groups = FilenameSimilarity.groupBySimilarity(filenames, 0.8); // 80% similarity threshold
      if (groups.length === 0) {
        groups = FilenameSimilarity.groupBySimilarity(filenames, 0.6); // 60% similarity threshold
      }
      if (groups.length === 0) {
        groups = FilenameSimilarity.groupBySimilarity(filenames, 0.4); // 40% similarity threshold
      }

      console.log(`   Created ${groups.length} groups with similarity threshold`);
      
      // Debug: Show some potential groups
      if (groups.length === 0 && filenames.length > 1) {
        console.log(`   Debug: Checking first few files for similarity...`);
        const firstFile = filenames[0];
        for (let i = 1; i < Math.min(5, filenames.length); i++) {
          const similarity = FilenameSimilarity.calculateSimilarity(firstFile, filenames[i]);
          console.log(`     ${firstFile} vs ${filenames[i]}: ${(similarity.similarity * 100).toFixed(1)}% similar`);
        }
      }

      // Process each group
      for (const group of groups) {
        if (group.length < 2) continue; // Skip single files

        const groupName = FilenameSimilarity.generateGroupName(group);
        const groupPath = join(categoryPath, groupName);

        console.log(`   📁 Creating group: ${groupName} (${group.length} files)`);

        // Create subfolder
        try {
          mkdirSync(groupPath, { recursive: true });
        } catch (error) {
          console.log(`   ⚠️  Could not create folder ${groupName}: ${error}`);
          continue;
        }

        // Move files to subfolder
        let movedCount = 0;
        for (const filename of group) {
          const fileInfo = fileInfos.find(f => f.name === filename);
          if (!fileInfo) continue;

          const newPath = join(groupPath, filename);
          
          try {
            renameSync(fileInfo.fullPath, newPath);
            movedCount++;
          } catch (error) {
            console.log(`   ⚠️  Could not move ${filename}: ${error}`);
          }
        }

        results.organizedFiles += movedCount;
        results.groupsCreated++;
        results.groups.push({
          folderName: groupName,
          files: group,
          similarity: 0.6
        });

        console.log(`   ✅ Moved ${movedCount} files to ${groupName}/`);
      }

      results.totalFiles += fileInfos.length;

    } catch (error) {
      console.error(`❌ Error processing ${category}:`, error);
    }
  }

  // Print summary
  console.log('\n📊 Organization Summary:');
  console.log(`   Total files processed: ${results.totalFiles}`);
  console.log(`   Files organized: ${results.organizedFiles}`);
  console.log(`   Groups created: ${results.groupsCreated}`);
  
  if (results.groups.length > 0) {
    console.log('\n📁 Groups created:');
    results.groups.forEach(group => {
      console.log(`   ${group.folderName}/ (${group.files.length} files)`);
      group.files.slice(0, 3).forEach(file => {
        console.log(`     - ${file}`);
      });
      if (group.files.length > 3) {
        console.log(`     ... and ${group.files.length - 3} more`);
      }
    });
  }

  console.log('\n✨ Organization complete!');
}

// Run the script
organizeDownloads(); 