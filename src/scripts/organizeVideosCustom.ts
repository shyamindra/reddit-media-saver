import { readdirSync, mkdirSync, renameSync, existsSync, statSync } from 'fs';
import { join } from 'path';

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
 * Custom script to organize video files by celebrity names and common patterns
 */
async function organizeVideosCustom() {
  console.log('📁 Custom organization of video files by celebrity names and patterns...\n');

  const videosDir = 'downloads/Videos';
  const results: OrganizationResult = {
    totalFiles: 0,
    organizedFiles: 0,
    groupsCreated: 0,
    groups: []
  };

  if (!existsSync(videosDir)) {
    console.log(`❌ Videos directory not found: ${videosDir}`);
    return;
  }

  try {
    const files = readdirSync(videosDir);
    
    // Check if "other" folder exists and get files from it
    const otherPath = join(videosDir, 'other');
    let otherFiles: string[] = [];
    if (existsSync(otherPath)) {
      try {
        otherFiles = readdirSync(otherPath)
          .filter(file => {
            const fullPath = join(otherPath, file);
            const stats = existsSync(fullPath) ? statSync(fullPath) : null;
            return stats && stats.isFile();
          })
          .map(file => file);
      } catch (error) {
        console.log(`   ⚠️  Could not read other folder: ${error}`);
      }
    }
    
    const fileInfos: FileInfo[] = files
      .filter(file => {
        const fullPath = join(videosDir, file);
        const stats = existsSync(fullPath) ? statSync(fullPath) : null;
        // Skip hidden files, directories, and the "other" folder itself
        return !file.startsWith('.') && 
               !file.endsWith('/') && 
               file !== 'other' && 
               stats && 
               stats.isFile();
      })
      .map(file => ({
        name: file,
        path: file,
        fullPath: join(videosDir, file)
      }))
      .concat(otherFiles.map(file => ({
        name: file,
        path: file,
        fullPath: join(otherPath, file)
      })));

    if (fileInfos.length === 0) {
      console.log(`   No video files found in ${videosDir}`);
      return;
    }

    console.log(`   Found ${fileInfos.length} video files`);

    // Define celebrity patterns with variations
    const celebrityPatterns = [
      // Jane Doe 1
      {
        name: 'jane-doe1',
        patterns: ['pattern1', 'pattern1'],
        files: []
      },
      // Jane Doe 2
      {
        name: 'jane-doe2',
        patterns: ['pattern2', 'pattern2'],
        files: []
      },
      // Jane Doe 3
      {
        name: 'jane-doe3',
        patterns: ['pattern3', 'pattern3'],
        files: []
      },
      // Jane Doe 4
      {
        name: 'jane-doe4',
        patterns: ['pattern4'],
        files: []
      },
      // Jane Doe 5
      {
        name: 'jane-doe5',
        patterns: ['pattern5'],
        files: []
      },
      // Jane Doe 6
      {
        name: 'jane-doe6',
        patterns: ['pattern6', 'pattern6a'],
        files: []
      },
      // Jane Doe 7
      {
        name: 'jane-doe7',
        patterns: ['pattern7'],
        files: []
      },
      // Jane Doe 8
      {
        name: 'jane-doe8',
        patterns: ['pattern8'],
        files: []
      },
      // Jane Doe 9
      {
        name: 'jane-doe9',
        patterns: ['pattern9'],
        files: []
      },
      // Jane Doe 10
      {
        name: 'jane-doe10',
        patterns: ['pattern10'],
        files: []
      },
      // Jane Doe 11
      {
        name: 'jane-doe11',
        patterns: ['pattern11'],
        files: []
      },
      // Jane Doe 12
      {
        name: 'jane-doe12',
        patterns: ['pattern12'],
        files: []
      },
      // Jane Doe 13
      {
        name: 'jane-doe13',
        patterns: ['pattern13'],
        files: []
      },
      // Jane Doe 14
      {
        name: 'jane-doe14',
        patterns: ['pattern14'],
        files: []
      },
      // Jane Doe 15
      {
        name: 'jane-doe15',
        patterns: ['pattern15'],
        files: []
      },
      // Jane Doe 16
      {
        name: 'jane-doe16',
        patterns: ['pattern16'],
        files: []
      },
      // Jane Doe 17
      {
        name: 'jane-doe17',
        patterns: ['pattern17'],
        files: []
      },
      // Jane Doe 18
      {
        name: 'jane-doe18',
        patterns: ['pattern18', 'pattern18a'],
        files: []
      },
      // Jane Doe 19
      {
        name: 'jane-doe19',
        patterns: ['pattern19'],
        files: []
      },
      // Jane Doe 20
      {
        name: 'jane-doe20',
        patterns: ['pattern20'],
        files: []
      },
      // Jane Doe 21
      {
        name: 'jane-doe21',
        patterns: ['pattern21'],
        files: []
      },
      // Jane Doe 22
      {
        name: 'jane-doe22',
        patterns: ['pattern22'],
        files: []
      },
      // Jane Doe 23
      {
        name: 'jane-doe23',
        patterns: ['pattern23'],
        files: []
      },
      // Jane Doe 24
      {
        name: 'jane-doe24',
        patterns: ['pattern24'],
        files: []
      },
      // Jane Doe 25
      {
        name: 'jane-doe25',
        patterns: ['pattern25'],
        files: []
      },
      // Jane Doe 26
      {
        name: 'jane-doe26',
        patterns: ['pattern26'],
        files: []
      },
      // Jane Doe 27
      {
        name: 'jane-doe27',
        patterns: ['pattern27'],
        files: []
      },
      // Jane Doe 28
      {
        name: 'jane-doe28',
        patterns: ['pattern28'],
        files: []
      },
      // Jane Doe 29
      {
        name: 'jane-doe29',
        patterns: ['pattern29'],
        files: []
      },
      // Jane Doe 30
      {
        name: 'jane-doe30',
        patterns: ['pattern30'],
        files: []
      },
      // Jane Doe 31
      {
        name: 'jane-doe31',
        patterns: ['pattern31'],
        files: []
      },
      // Jane Doe 32
      {
        name: 'jane-doe32',
        patterns: ['pattern32'],
        files: []
      },
      // Jane Doe 33
      {
        name: 'jane-doe33',
        patterns: ['pattern33'],
        files: []
      },
      // Jane Doe 34
      {
        name: 'jane-doe34',
        patterns: ['pattern34'],
        files: []
      },
      // Jane Doe 35
      {
        name: 'jane-doe35',
        patterns: ['pattern35'],
        files: []
      },
      // Jane Doe 36
      {
        name: 'jane-doe36',
        patterns: ['pattern36'],
        files: []
      },
      // Jane Doe 37
      {
        name: 'jane-doe37',
        patterns: ['pattern37'],
        files: []
      },
      // Jane Doe 38
      {
        name: 'jane-doe38',
        patterns: ['pattern38'],
        files: []
      },
      // Jane Doe 39
      {
        name: 'jane-doe39',
        patterns: ['pattern39'],
        files: []
      },
      // Jane Doe 40
      {
        name: 'jane-doe40',
        patterns: ['pattern40'],
        files: []
      },
      // Jane Doe 41
      {
        name: 'jane-doe41',
        patterns: ['pattern41'],
        files: []
      },
      // Jane Doe 42
      {
        name: 'jane-doe42',
        patterns: ['pattern42'],
        files: []
      },
      // Jane Doe 43
      {
        name: 'jane-doe43',
        patterns: ['pattern43'],
        files: []
      },
      // Jane Doe 44
      {
        name: 'jane-doe44',
        patterns: ['pattern44'],
        files: []
      },
      // Jane Doe 45
      {
        name: 'jane-doe45',
        patterns: ['pattern45'],
        files: []
      },
      // Jane Doe 46
      {
        name: 'jane-doe46',
        patterns: ['pattern46'],
        files: []
      },
      // Jane Doe 47
      {
        name: 'jane-doe47',
        patterns: ['pattern47'],
        files: []
      },
      // Jane Doe 48
      {
        name: 'jane-doe48',
        patterns: ['pattern48'],
        files: []
      },
      // Jane Doe 49
      {
        name: 'jane-doe49',
        patterns: ['pattern49'],
        files: []
      },
      // Jane Doe 50
      {
        name: 'jane-doe50',
        patterns: ['pattern50'],
        files: []
      },
      // Jane Doe 51
      {
        name: 'jane-doe51',
        patterns: ['pattern51'],
        files: []
      },
      // Jane Doe 52
      {
        name: 'jane-doe52',
        patterns: ['pattern52', 'pattern52a'],
        files: []
      },
      // Jane Doe 53
      {
        name: 'jane-doe53',
        patterns: ['pattern53'],
        files: []
      },
      // Jane Doe 54
      {
        name: 'jane-doe54',
        patterns: ['pattern54'],
        files: []
      },
      // Jane Doe 55
      {
        name: 'jane-doe55',
        patterns: ['pattern55'],
        files: []
      },
      // Jane Doe 56
      {
        name: 'jane-doe56',
        patterns: ['pattern56'],
        files: []
      },
      // Jane Doe 57
      {
        name: 'jane-doe57',
        patterns: ['pattern57'],
        files: []
      },
      // Jane Doe 58
      {
        name: 'jane-doe58',
        patterns: ['pattern58'],
        files: []
      },
      // Jane Doe 59
      {
        name: 'jane-doe59',
        patterns: ['pattern59'],
        files: []
      },
      // Jane Doe 60
      {
        name: 'jane-doe60',
        patterns: ['pattern60'],
        files: []
      },
      // Jane Doe 61
      {
        name: 'jane-doe61',
        patterns: ['pattern61'],
        files: []
      },
      // Jane Doe 62
      {
        name: 'jane-doe62',
        patterns: ['pattern62'],
        files: []
      },
      // Jane Doe 63
      {
        name: 'jane-doe63',
        patterns: ['pattern63'],
        files: []
      },
      // Jane Doe 64
      {
        name: 'jane-doe64',
        patterns: ['pattern64'],
        files: []
      },
      // Jane Doe 65
      {
        name: 'jane-doe65',
        patterns: ['pattern65'],
        files: []
      },
      // Jane Doe 66
      {
        name: 'jane-doe66',
        patterns: ['pattern66'],
        files: []
      },
      // Jane Doe 67
      {
        name: 'jane-doe67',
        patterns: ['pattern67', 'pattern67a'],
        files: []
      },
      // Jane Doe 68
      {
        name: 'jane-doe68',
        patterns: ['pattern68'],
        files: []
      }
    ];

    // Group files by celebrity patterns
    const processedFiles = new Set<string>();

    for (const celebrity of celebrityPatterns) {
      const matchingFiles = fileInfos.filter(file => {
        if (processedFiles.has(file.name)) return false;
        
        const fileName = file.name.toLowerCase();
        return celebrity.patterns.some(pattern => 
          fileName.includes(pattern.toLowerCase())
        );
      });

      if (matchingFiles.length >= 2) {
        celebrity.files = matchingFiles.map(f => f.name);
        processedFiles.add(...matchingFiles.map(f => f.name));
      }
    }

    // Create folders and move files
    for (const celebrity of celebrityPatterns) {
      if (celebrity.files.length >= 2) {
        const groupPath = join(videosDir, celebrity.name);
        
        console.log(`   📁 Creating group: ${celebrity.name} (${celebrity.files.length} files)`);

        try {
          mkdirSync(groupPath, { recursive: true });
        } catch (error) {
          console.log(`   ⚠️  Could not create folder ${celebrity.name}: ${error}`);
          continue;
        }

        // Move files to subfolder
        let movedCount = 0;
        for (const filename of celebrity.files) {
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
          folderName: celebrity.name,
          files: celebrity.files,
          pattern: celebrity.patterns[0]
        });

        console.log(`   ✅ Moved ${movedCount} files to ${celebrity.name}/`);
      }
    }

    // Move remaining unorganized files to "other" folder
    const remainingFiles = fileInfos.filter(file => !processedFiles.has(file.name));
    
    if (remainingFiles.length > 0) {
      const otherPath = join(videosDir, 'other');
      
      console.log(`\n   📁 Creating group: other (${remainingFiles.length} files)`);
      
      try {
        mkdirSync(otherPath, { recursive: true });
      } catch (error) {
        console.log(`   ⚠️  Could not create folder other: ${error}`);
      }

      // Move remaining files to other folder
      let movedCount = 0;
      for (const fileInfo of remainingFiles) {
        const newPath = join(otherPath, fileInfo.name);
        
        try {
          renameSync(fileInfo.fullPath, newPath);
          movedCount++;
        } catch (error) {
          console.log(`   ⚠️  Could not move ${fileInfo.name}: ${error}`);
        }
      }

      results.organizedFiles += movedCount;
      results.groupsCreated++;
      results.groups.push({
        folderName: 'other',
        files: remainingFiles.map(f => f.name),
        pattern: 'unorganized'
      });

      console.log(`   ✅ Moved ${movedCount} files to other/`);
    }

    results.totalFiles = fileInfos.length;

    // Print summary
    console.log('\n📊 Custom Organization Summary:');
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

    console.log('\n✨ Custom organization complete!');

  } catch (error) {
    console.error(`❌ Error processing videos:`, error);
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  organizeVideosCustom().catch(console.error);
}

export { organizeVideosCustom }; 