# Reddit Links File Download - Consolidated Guide

## 🎯 **Overview**
This guide covers the consolidated Reddit media download system that processes URLs from CSV files and downloads content automatically.

## 📁 **File Structure**
```
reddit-links/             # Input directory with CSV files
├── sample.csv            # CSV files with key,URL format
├── batch2.csv            # Multiple files supported
└── your-files.csv        # Add more CSV files

downloads/                # Output directory (auto-created)
├── Images/               # Downloaded images
├── Videos/               # Downloaded videos
├── Gifs/                 # Downloaded GIFs
└── Notes/                # Text posts and links

failed-downloads.txt      # Failed URLs for retry
```

## 🚀 **Quick Start**

### **Basic Usage**
```bash
# Process all URLs from CSV files
npm run process-links

# Test with first 20 URLs
npm run process-links:test

# Process in batch mode
npm run process-links:batch

# Show help
npm run process-links:help
```

### **Advanced Usage**
```bash
# Process with custom options
npm run process-links -- --limit 50 --input my-links --output my-downloads

# Test with specific number of URLs
npm run process-links -- --test --limit 10

# Use custom input directory
npm run process-links -- --input custom-links
```

## 📄 **CSV File Format**

### **Required Format**
CSV files should have the following format:
```csv
key1,https://www.reddit.com/r/pics/comments/abc123/some_post/
key2,https://www.reddit.com/r/videos/comments/def456/another_post/
key3,https://www.reddit.com/r/AskReddit/comments/ghi789/comment/abc123/
```

### **File Requirements**
- Files must be in the `reddit-links/` directory
- Files must have `.csv` extension
- First column: key/identifier (can be anything)
- Second column: Reddit URL
- Lines starting with `#` are treated as comments
- Empty lines are ignored

## 🔧 **Available Commands**

### **Main Processing**
```bash
npm run process-links              # Process all URLs
npm run process-links:test         # Test with 20 URLs
npm run process-links:batch        # Batch processing mode
npm run process-links:help         # Show help
```

### **Batch Processing (Rate Limiting)**
```bash
npm run process-links:batch20      # Process 20 URLs
npm run process-links:batch50      # Process 50 URLs
npm run process-links:batch100     # Process 100 URLs
```

### **Command Line Options**
```bash
--test, -t              # Test mode (20 URLs by default)
--batch, -b             # Batch mode
--limit <number>, -l    # Limit number of URLs
--offset <number>, -o   # Start from this URL index (for rate limiting)
--input <dir>, -i       # Input directory
--output <dir>, -out    # Output directory
--retry, -r             # Retry failed downloads
--help, -h              # Show help
```

### **Utility Commands**
```bash
npm run retry-failed              # Retry failed downloads
npm run organize-downloads        # Organize downloaded files
npm run organize-downloads-advanced  # Advanced organization
npm run move-gifs                 # Move GIFs to dedicated folder
npm run debug-api                 # Debug Reddit API
```

## 📊 **Features**

### **✅ What Works**
- ✅ CSV file reading and validation
- ✅ Reddit URL parsing and validation
- ✅ Content type detection (images, videos, GIFs, text)
- ✅ Automatic file organization
- ✅ Progress tracking and reporting
- ✅ Failed download retry system
- ✅ Command line options and modes
- ✅ Error handling and logging

### **📁 Content Organization**
- **Images**: JPG, PNG, WebP files → `downloads/Images/`
- **Videos**: MP4, WebM files → `downloads/Videos/`
- **GIFs**: GIF files → `downloads/Gifs/`
- **Text Posts**: Self posts → `downloads/Notes/`
- **Links**: External links → `downloads/Notes/`

### **🔄 Retry System**
- Failed downloads are saved to `failed-downloads.txt`
- Use `npm run retry-failed` to retry failed downloads
- Automatic error categorization and handling

### **⏱️ Rate Limiting**
- Process URLs in small batches to avoid 429 errors
- Use `--offset` and `--limit` to control batch size
- Script shows next batch command for easy continuation
- Built-in 1-second delay between requests

## 🛠 **Technical Details**

### **Architecture**
- **TypeScript-based**: Robust type safety and error handling
- **Service-oriented**: Clear separation of concerns
- **Modular design**: Easy to extend and maintain

### **Key Services**
- `FileInputService`: CSV processing and URL validation
- `ContentDownloadService`: Content downloading and organization
- `MediaUtils`: File type detection and naming
- `FolderOrganizer`: File organization and grouping

### **Error Handling**
1. **Invalid URLs**: Skipped and logged
2. **Network Errors**: Retried up to 3 times
3. **Rate Limiting**: Automatic delays and retries
4. **File System Errors**: Logged and continued
5. **Content Not Found**: Skipped and logged

## 📈 **Performance**

### **Speed Estimates**
- **Small batch (20 URLs)**: ~1-2 minutes
- **Medium batch (100 URLs)**: ~5-10 minutes
- **Large batch (1000+ URLs)**: ~1-2 hours

### **Rate Limiting**
- 1 second delay between requests (respectful to Reddit)
- Automatic retry on rate limit errors
- User-Agent header for API compliance

## 🔍 **Troubleshooting**

### **Common Issues**

#### **No URLs Found**
```bash
# Check if CSV files exist
ls reddit-links/

# Check CSV format
head -5 reddit-links/sample.csv
```

#### **Download Failures**
```bash
# Check failed downloads
cat failed-downloads.txt

# Retry failed downloads
npm run retry-failed
```

#### **Permission Errors**
```bash
# Check directory permissions
ls -la downloads/

# Create directories manually if needed
mkdir -p downloads/{Images,Videos,Gifs,Notes}
```

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=* npm run process-links

# Test API connectivity
npm run debug-api
```

## 📝 **Examples**

### **Example 1: Basic Processing**
```bash
# Process all URLs from CSV files
npm run process-links
```

### **Example 2: Test Mode**
```bash
# Test with first 20 URLs
npm run process-links:test
```

### **Example 3: Custom Limit**
```bash
# Process first 50 URLs
npm run process-links -- --limit 50
```

### **Example 4: Rate Limiting with Offset**
```bash
# Process URLs 0-20 (first batch)
npm run process-links -- --limit 20

# Process URLs 20-40 (second batch)
npm run process-links -- --offset 20 --limit 20

# Process URLs 40-60 (third batch)
npm run process-links -- --offset 40 --limit 20

# Process URLs 60-80 (fourth batch)
npm run process-links -- --offset 60 --limit 20
```

### **Example 5: Custom Directories**
```bash
# Use custom input and output directories
npm run process-links -- --input my-links --output my-downloads
```

### **Example 6: Retry Failed Downloads**
```bash
# Retry previously failed downloads
npm run retry-failed
```

## 🎯 **Success Criteria**
- [x] Process 100+ URLs successfully
- [x] Organize content in correct folders
- [x] Generate meaningful filenames
- [x] Provide clear summary report
- [x] Support retry functionality
- [x] Handle errors gracefully
- [x] Command line interface
- [x] Multiple processing modes

## 📚 **Related Documentation**
- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - Current project status
- [CLEANUP_PLAN.md](./CLEANUP_PLAN.md) - Cleanup implementation details
- [API.md](./API.md) - API documentation
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Troubleshooting guide 