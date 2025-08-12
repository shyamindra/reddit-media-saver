import { readdir, stat, rename, rmdir } from 'fs/promises';
import { join } from 'path';

async function flattenVideosFolder() {
  const videosDir = 'downloads/Videos';
  
  try {
    console.log('🔄 Starting to flatten Videos folder...');
    
    // Get all items in the Videos directory
    const items = await readdir(videosDir);
    let movedFiles = 0;
    let deletedFolders = 0;
    
    for (const item of items) {
      const itemPath = join(videosDir, item);
      const stats = await stat(itemPath);
      
      if (stats.isDirectory()) {
        console.log(`📁 Processing subfolder: ${item}`);
        
        // Get all files in the subfolder
        const subfolderItems = await readdir(itemPath);
        
        for (const file of subfolderItems) {
          const filePath = join(itemPath, file);
          const fileStats = await stat(filePath);
          
          if (fileStats.isFile()) {
            const newFilePath = join(videosDir, file);
            
            // Check if file already exists in main folder
            let finalFileName = file;
            let counter = 1;
            
            while (true) {
              try {
                await stat(join(videosDir, finalFileName));
                // File exists, create new name
                const nameParts = file.split('.');
                const extension = nameParts.pop();
                const baseName = nameParts.join('.');
                finalFileName = `${baseName}_${counter}.${extension}`;
                counter++;
              } catch {
                // File doesn't exist, we can use this name
                break;
              }
            }
            
            // Move the file
            await rename(filePath, join(videosDir, finalFileName));
            console.log(`  📄 Moved: ${file} → ${finalFileName}`);
            movedFiles++;
          }
        }
        
        // Delete the empty subfolder
        await rmdir(itemPath);
        console.log(`  🗑️  Deleted empty folder: ${item}`);
        deletedFolders++;
      }
    }
    
    console.log('\n✅ Flattening completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Files moved: ${movedFiles}`);
    console.log(`   - Folders deleted: ${deletedFolders}`);
    console.log(`   - All files are now in: ${videosDir}`);
    
  } catch (error) {
    console.error('❌ Error flattening Videos folder:', error);
    process.exit(1);
  }
}

// Run the script
flattenVideosFolder(); 