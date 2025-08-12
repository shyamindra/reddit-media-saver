import { readdirSync, mkdirSync, renameSync, existsSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Script to move GIF files from Notes folder to new Gifs folder
 */
async function moveGifsToGifsFolder() {
  console.log('🔄 Moving GIF files to dedicated Gifs folder...\n');

  const downloadsDir = 'downloads';
  const notesDir = join(downloadsDir, 'Notes');
  const gifsDir = join(downloadsDir, 'Gifs');

  let movedCount = 0;
  let errorCount = 0;

  try {
    // Create Gifs directory if it doesn't exist
    if (!existsSync(gifsDir)) {
      mkdirSync(gifsDir, { recursive: true });
      console.log('📁 Created Gifs directory');
    }

    // Find all GIF files in Notes directory (including subdirectories)
    const moveGifsFromDirectory = (dirPath: string, relativePath: string = '') => {
      if (!existsSync(dirPath)) return;

      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stats = statSync(itemPath);
        
        if (stats.isDirectory()) {
          // Recursively process subdirectories
          const subDirPath = join(relativePath, item);
          moveGifsFromDirectory(itemPath, subDirPath);
        } else if (item.toLowerCase().endsWith('.gif')) {
          // Move GIF file
          const sourcePath = itemPath;
          const targetPath = join(gifsDir, relativePath, item);
          
          // Create subdirectory structure in Gifs folder if needed
          if (relativePath) {
            const targetDir = join(gifsDir, relativePath);
            if (!existsSync(targetDir)) {
              mkdirSync(targetDir, { recursive: true });
            }
          }
          
          try {
            renameSync(sourcePath, targetPath);
            console.log(`✅ Moved: ${relativePath ? relativePath + '/' : ''}${item}`);
            movedCount++;
          } catch (error) {
            console.log(`❌ Error moving ${item}: ${error}`);
            errorCount++;
          }
        }
      }
    };

    // Start moving GIFs from Notes directory
    moveGifsFromDirectory(notesDir);

    console.log('\n📊 GIF Move Summary:');
    console.log(`   GIFs moved: ${movedCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    if (movedCount > 0) {
      console.log('\n📁 GIFs are now organized in: downloads/Gifs/');
    }

    console.log('\n✨ GIF organization complete!');

  } catch (error) {
    console.error('❌ Error during GIF organization:', error);
  }
}

// Run the script
moveGifsToGifsFolder(); 