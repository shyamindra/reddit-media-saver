import { runOrganizeByPattern, type NamedPatternGroup } from '../repair/organizeByPattern';

/**
 * Custom script to organize video files by celebrity names and common patterns
 */
async function organizeVideosCustom() {
  console.log('📁 Custom organization of video files by celebrity names and patterns...\n');

  const celebrityPatterns: NamedPatternGroup[] = [
      // Jane Doe 1
      {
        folderName: 'jane-doe1',
        patterns: ['pattern1', 'pattern1'],
      },
      // Jane Doe 2
      {
        folderName: 'jane-doe2',
        patterns: ['pattern2', 'pattern2'],
      },
      // Jane Doe 3
      {
        folderName: 'jane-doe3',
        patterns: ['pattern3', 'pattern3'],
      },
      // Jane Doe 4
      {
        folderName: 'jane-doe4',
        patterns: ['pattern4'],
      },
      // Jane Doe 5
      {
        folderName: 'jane-doe5',
        patterns: ['pattern5'],
      },
      // Jane Doe 6
      {
        folderName: 'jane-doe6',
        patterns: ['pattern6', 'pattern6a'],
      },
      // Jane Doe 7
      {
        folderName: 'jane-doe7',
        patterns: ['pattern7'],
      },
      // Jane Doe 8
      {
        folderName: 'jane-doe8',
        patterns: ['pattern8'],
      },
      // Jane Doe 9
      {
        folderName: 'jane-doe9',
        patterns: ['pattern9'],
      },
      // Jane Doe 10
      {
        folderName: 'jane-doe10',
        patterns: ['pattern10'],
      },
      // Jane Doe 11
      {
        folderName: 'jane-doe11',
        patterns: ['pattern11'],
      },
      // Jane Doe 12
      {
        folderName: 'jane-doe12',
        patterns: ['pattern12'],
      },
      // Jane Doe 13
      {
        folderName: 'jane-doe13',
        patterns: ['pattern13'],
      },
      // Jane Doe 14
      {
        folderName: 'jane-doe14',
        patterns: ['pattern14'],
      },
      // Jane Doe 15
      {
        folderName: 'jane-doe15',
        patterns: ['pattern15'],
      },
      // Jane Doe 16
      {
        folderName: 'jane-doe16',
        patterns: ['pattern16'],
      },
      // Jane Doe 17
      {
        folderName: 'jane-doe17',
        patterns: ['pattern17'],
      },
      // Jane Doe 18
      {
        folderName: 'jane-doe18',
        patterns: ['pattern18', 'pattern18a'],
      },
      // Jane Doe 19
      {
        folderName: 'jane-doe19',
        patterns: ['pattern19'],
      },
      // Jane Doe 20
      {
        folderName: 'jane-doe20',
        patterns: ['pattern20'],
      },
      // Jane Doe 21
      {
        folderName: 'jane-doe21',
        patterns: ['pattern21'],
      },
      // Jane Doe 22
      {
        folderName: 'jane-doe22',
        patterns: ['pattern22'],
      },
      // Jane Doe 23
      {
        folderName: 'jane-doe23',
        patterns: ['pattern23'],
      },
      // Jane Doe 24
      {
        folderName: 'jane-doe24',
        patterns: ['pattern24'],
      },
      // Jane Doe 25
      {
        folderName: 'jane-doe25',
        patterns: ['pattern25'],
      },
      // Jane Doe 26
      {
        folderName: 'jane-doe26',
        patterns: ['pattern26'],
      },
      // Jane Doe 27
      {
        folderName: 'jane-doe27',
        patterns: ['pattern27'],
      },
      // Jane Doe 28
      {
        folderName: 'jane-doe28',
        patterns: ['pattern28'],
      },
      // Jane Doe 29
      {
        folderName: 'jane-doe29',
        patterns: ['pattern29'],
      },
      // Jane Doe 30
      {
        folderName: 'jane-doe30',
        patterns: ['pattern30'],
      },
      // Jane Doe 31
      {
        folderName: 'jane-doe31',
        patterns: ['pattern31'],
      },
      // Jane Doe 32
      {
        folderName: 'jane-doe32',
        patterns: ['pattern32'],
      },
      // Jane Doe 33
      {
        folderName: 'jane-doe33',
        patterns: ['pattern33'],
      },
      // Jane Doe 34
      {
        folderName: 'jane-doe34',
        patterns: ['pattern34'],
      },
      // Jane Doe 35
      {
        folderName: 'jane-doe35',
        patterns: ['pattern35'],
      },
      // Jane Doe 36
      {
        folderName: 'jane-doe36',
        patterns: ['pattern36'],
      },
      // Jane Doe 37
      {
        folderName: 'jane-doe37',
        patterns: ['pattern37'],
      },
      // Jane Doe 38
      {
        folderName: 'jane-doe38',
        patterns: ['pattern38'],
      },
      // Jane Doe 39
      {
        folderName: 'jane-doe39',
        patterns: ['pattern39'],
      },
      // Jane Doe 40
      {
        folderName: 'jane-doe40',
        patterns: ['pattern40'],
      },
      // Jane Doe 41
      {
        folderName: 'jane-doe41',
        patterns: ['pattern41'],
      },
      // Jane Doe 42
      {
        folderName: 'jane-doe42',
        patterns: ['pattern42'],
      },
      // Jane Doe 43
      {
        folderName: 'jane-doe43',
        patterns: ['pattern43'],
      },
      // Jane Doe 44
      {
        folderName: 'jane-doe44',
        patterns: ['pattern44'],
      },
      // Jane Doe 45
      {
        folderName: 'jane-doe45',
        patterns: ['pattern45'],
      },
      // Jane Doe 46
      {
        folderName: 'jane-doe46',
        patterns: ['pattern46'],
      },
      // Jane Doe 47
      {
        folderName: 'jane-doe47',
        patterns: ['pattern47'],
      },
      // Jane Doe 48
      {
        folderName: 'jane-doe48',
        patterns: ['pattern48'],
      },
      // Jane Doe 49
      {
        folderName: 'jane-doe49',
        patterns: ['pattern49'],
      },
      // Jane Doe 50
      {
        folderName: 'jane-doe50',
        patterns: ['pattern50'],
      },
      // Jane Doe 51
      {
        folderName: 'jane-doe51',
        patterns: ['pattern51'],
      },
      // Jane Doe 52
      {
        folderName: 'jane-doe52',
        patterns: ['pattern52', 'pattern52a'],
      },
      // Jane Doe 53
      {
        folderName: 'jane-doe53',
        patterns: ['pattern53'],
      },
      // Jane Doe 54
      {
        folderName: 'jane-doe54',
        patterns: ['pattern54'],
      },
      // Jane Doe 55
      {
        folderName: 'jane-doe55',
        patterns: ['pattern55'],
      },
      // Jane Doe 56
      {
        folderName: 'jane-doe56',
        patterns: ['pattern56'],
      },
      // Jane Doe 57
      {
        folderName: 'jane-doe57',
        patterns: ['pattern57'],
      },
      // Jane Doe 58
      {
        folderName: 'jane-doe58',
        patterns: ['pattern58'],
      },
      // Jane Doe 59
      {
        folderName: 'jane-doe59',
        patterns: ['pattern59'],
      },
      // Jane Doe 60
      {
        folderName: 'jane-doe60',
        patterns: ['pattern60'],
      },
      // Jane Doe 61
      {
        folderName: 'jane-doe61',
        patterns: ['pattern61'],
      },
      // Jane Doe 62
      {
        folderName: 'jane-doe62',
        patterns: ['pattern62'],
      },
      // Jane Doe 63
      {
        folderName: 'jane-doe63',
        patterns: ['pattern63'],
      },
      // Jane Doe 64
      {
        folderName: 'jane-doe64',
        patterns: ['pattern64'],
      },
      // Jane Doe 65
      {
        folderName: 'jane-doe65',
        patterns: ['pattern65'],
      },
      // Jane Doe 66
      {
        folderName: 'jane-doe66',
        patterns: ['pattern66'],
      },
      // Jane Doe 67
      {
        folderName: 'jane-doe67',
        patterns: ['pattern67', 'pattern67a'],
      },
      // Jane Doe 68
      {
        folderName: 'jane-doe68',
        patterns: ['pattern68'],
      }
  ];

  const summary = runOrganizeByPattern({
    namedGroups: celebrityPatterns,
    categories: ['Videos'],
    collectOther: true,
    dryRun: false,
  });

  console.log('\n📊 Custom Organization Summary:');
  console.log(`   Total files processed: ${summary.totalFiles}`);
  console.log(`   Files organized: ${summary.organizedFiles}`);
  console.log(`   Groups created: ${summary.groupsCreated}`);

  if (summary.groups.length > 0) {
    console.log('\n📁 Groups created:');
    for (const group of summary.groups) {
      console.log(`   ${group.folderName}/ (${group.files.length} files) - Pattern: ${group.pattern}`);
      for (const file of group.files.slice(0, 3)) {
        console.log(`     - ${file}`);
      }
      if (group.files.length > 3) {
        console.log(`     ... and ${group.files.length - 3} more`);
      }
    }
  }

  console.log('\n✨ Custom organization complete!');
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  organizeVideosCustom().catch(console.error);
}

export { organizeVideosCustom }; 