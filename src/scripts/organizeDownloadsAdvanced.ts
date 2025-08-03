import { readdirSync, mkdirSync, renameSync, existsSync } from 'fs';
import { join } from 'path';
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
    pattern: string;
  }>;
}

/**
 * Advanced script to organize downloaded files by common patterns and subreddits
 */
async function organizeDownloadsAdvanced() {
  console.log('📁 Advanced organization of downloaded files...\n');

  const downloadsDir = 'downloads';
  const categories = ['Images', 'Videos', 'Gifs', 'Notes'];
  const results: OrganizationResult = {
    totalFiles: 0,
    organizedFiles: 0,
    groupsCreated: 0,
    groups: []
  };

  // Common patterns to look for
  const patterns = [
    'Retro_Scenes',
    'KoreanCelebrityFap',
    'ilovelesbians',
    'WatchItForThePlot',
    'Celebs',
    'celebrities',
    'celebnsfw',
    'PornStarHQ',
    'nakednews',
    'softcorenights',
    'HotWebScene',
    'OldSchoolCool',
    'Skysportnewsfemale',
    'BritishCelebrityBabe',
    'EroticButNotPorn',
    'nsfwcelebs',
    'NostalgiaFapping',
    '60fpsVintagePorn',
    'VintagePorn',
    'PornStarletHQ',
    'OldMenEatingPussy',
    'IndianCelebScenes',
    'SuperModelIndia',
    'IndianCelebrityBabe',
    'HorrorMovieNudes',
    'ADHD',
    'AFL',
    'AusFinance',
    'melbourne',
    'AskReddit',
    'productivity',
    'youtube',
    'ADHD',
    'melbourne',
    'HolUp',
    'auscorp',
    'melbourneriders',
    'Ni_Bondha',
    'ask_Bondha',
    'adhdaustralia',
    'lewdgames',
    'pornID_alt',
    'NVG_NSFW',
    'youtube',
    'productivity',
    'Ni_Bondha',
    'HolUp',
    'auscorp',
    'melbourneriders',
    'Ni_Bondha',
    'ADHD',
    'WatchItForThePlot',
    'melbourne',
    'AskReddit',
    'adhdaustralia'
  ];

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
        .filter(file => !file.startsWith('.') && !file.includes('/')) // Skip hidden files and subdirectories
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

      // Group files by patterns
      const patternGroups = new Map<string, string[]>();
      
      for (const fileInfo of fileInfos) {
        const filename = fileInfo.name;
        
        // Find matching pattern
        for (const pattern of patterns) {
          if (filename.includes(pattern)) {
            if (!patternGroups.has(pattern)) {
              patternGroups.set(pattern, []);
            }
            patternGroups.get(pattern)!.push(filename);
            break; // Use first matching pattern
          }
        }
      }

      // Process pattern groups
      for (const [pattern, files] of patternGroups.entries()) {
        if (files.length < 2) continue; // Skip single files

        const groupName = pattern.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const groupPath = join(categoryPath, groupName);

        console.log(`   📁 Creating group: ${groupName} (${files.length} files) - Pattern: ${pattern}`);

        // Create subfolder
        try {
          mkdirSync(groupPath, { recursive: true });
        } catch (error) {
          console.log(`   ⚠️  Could not create folder ${groupName}: ${error}`);
          continue;
        }

        // Move files to subfolder
        let movedCount = 0;
        for (const filename of files) {
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
          files: files,
          pattern: pattern
        });

        console.log(`   ✅ Moved ${movedCount} files to ${groupName}/`);
      }

      results.totalFiles += fileInfos.length;

    } catch (error) {
      console.error(`❌ Error processing ${category}:`, error);
    }
  }

  // Print summary
  console.log('\n📊 Advanced Organization Summary:');
  console.log(`   Total files processed: ${results.totalFiles}`);
  console.log(`   Files organized: ${results.organizedFiles}`);
  console.log(`   Groups created: ${results.groupsCreated}`);
  
  if (results.groups.length > 0) {
    console.log('\n📁 Groups created:');
    results.groups.forEach(group => {
      console.log(`   ${group.folderName}/ (${group.files.length} files) - Pattern: ${group.pattern}`);
      group.files.slice(0, 3).forEach(file => {
        console.log(`     - ${file}`);
      });
      if (group.files.length > 3) {
        console.log(`     ... and ${group.files.length - 3} more`);
      }
    });
  }

  console.log('\n✨ Advanced organization complete!');
}

// Run the script
organizeDownloadsAdvanced(); 