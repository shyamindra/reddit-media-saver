# Task List: Reddit Links File Download Feature

## Overview
Implement a simple feature to download Reddit content from a text file containing Reddit URLs, using existing organization and download logic.

## Phase 1: Basic File Processing & URL Validation

### Task 1.1: Create File Input Service
- [x] **Create `src/services/fileInputService.ts`**
  - [x] Add function to read CSV files with key,URL format
  - [x] Add function to validate Reddit URLs
  - [x] Add function to parse Reddit URL types (post, comment, media)
  - [x] Add error handling for file reading issues
  - [x] Add support for multiple CSV files in directory

### Task 1.2: Create URL Validation Logic
- [ ] **Enhance `src/utils/fileUtils.ts`**
  - [ ] Add Reddit URL validation function
  - [ ] Add URL type detection (post vs comment vs media)
  - [ ] Add URL parsing to extract subreddit, post ID, comment ID
  - [ ] Add tests for URL validation

### Task 1.3: Create Basic Processing Script
- [x] **Create `src/scripts/processRedditLinks.ts`**
  - [x] Read CSV files from `reddit-links/` directory
  - [x] Validate each URL
  - [x] Log valid/invalid URLs
  - [x] Basic error handling

## Phase 2: Content Download Integration

### Task 2.1: Enhance Reddit API Service
- [ ] **Update `src/services/redditApi.ts`**
  - [ ] Add function to fetch post content by URL
  - [ ] Add function to fetch comment content by URL
  - [ ] Add function to detect media content in posts
  - [ ] Add anonymous access fallback (no OAuth required)

### Task 2.2: Create Content Download Service
- [x] **Create `src/services/contentDownloadService.ts`**
  - [x] Add function to download post content
  - [x] Add function to download comment content
  - [x] Add function to download media files
  - [x] Integrate with existing `downloadService`
  - [x] Add progress tracking
  - [x] Retrieve post titles automatically from Reddit API

### Task 2.3: Integrate with Existing Services
- [ ] **Update `src/services/downloadService.ts`**
  - [ ] Add support for processing URL lists
  - [ ] Integrate with `fileInputService`
  - [ ] Add batch processing capabilities

## Phase 3: Folder Organization & File Management

### Task 3.1: Enhance File Organization
- [x] **Update `src/utils/folderOrganizer.ts`**
  - [x] Add function to organize downloaded content by type
  - [x] Integrate with existing subfolder grouping logic
  - [x] Add support for batch processing
  - [x] Add GIF folder support and organization

### Task 3.2: Enhance Filename Generation
- [ ] **Update `src/utils/mediaUtils.ts`**
  - [ ] Ensure filename generation works for URL-based downloads
  - [ ] Add fallback naming for content without titles
  - [ ] Handle special characters in Reddit titles

### Task 3.3: Create Output Directory Structure
- [ ] **Update `src/services/storageService.ts`**
  - [ ] Add function to create organized output structure
  - [ ] Add support for batch processing
  - [ ] Integrate with existing database schema

## Phase 4: Progress Tracking & Summary Reporting

### Task 4.1: Create Progress Tracking
- [x] **Create `src/utils/progressTracker.ts`**
  - [x] Add progress tracking for URL processing
  - [x] Add download progress tracking
  - [x] Add summary statistics

### Task 4.2: Create Summary Reporting
- [x] **Create `src/utils/summaryReporter.ts`**
  - [x] Add function to generate download summary
  - [x] Add function to create failed downloads list
  - [x] Add function to export retry file

### Task 4.3: Create Main Processing Script
- [x] **Update `src/scripts/processRedditLinks.ts`**
  - [x] Integrate progress tracking
  - [x] Add summary reporting
  - [x] Add retry file generation

## Phase 5: Error Handling & Retry Functionality

### Task 5.1: Enhanced Error Handling
- [x] **Create `src/utils/errorHandler.ts`**
  - [x] Add categorization of different error types
  - [x] Add retry logic for network errors
  - [x] Add logging for failed downloads

### Task 5.2: Retry Functionality
- [x] **Create `src/scripts/retryFailedDownloads.ts`**
  - [x] Read failed downloads from file
  - [x] Retry failed downloads
  - [x] Update summary with retry results

### Task 5.3: Logging & Debugging
- [x] **Enhance `src/utils/logger.ts`**
  - [x] Add specific logging for URL processing
  - [x] Add download progress logging
  - [x] Add error logging with context

## Phase 6: User Interface & Integration

### Task 6.1: Create Simple Web Interface
- [x] **Create `src/components/FileUpload.tsx`**
  - [x] Add file upload component
  - [x] Add processing status display
  - [x] Add summary display

### Task 6.2: Integrate with Main App
- [x] **Update `src/App.tsx`**
  - [x] Add file upload option to main interface
  - [x] Add processing status to main app
  - [x] Add download summary display

### Task 6.3: Create Command Line Interface
- [x] **Create `src/scripts/cli.ts`**
  - [x] Add command line argument parsing
  - [x] Add file path specification
  - [x] Add output directory specification

## Phase 7: Testing & Documentation

### Task 7.1: Create Test Files
- [x] **Create `src/services/fileInputService.test.ts`**
- [x] **Create `src/utils/progressTracker.test.ts`**
- [x] **Create `src/utils/summaryReporter.test.ts`**
- [x] **Create `src/scripts/processRedditLinks.test.ts`**

### Task 7.2: Create Sample Files
- [x] **Create `reddit-links/` directory with sample CSV files**
- [x] **Create `failed-downloads.txt` (sample retry file)**
- [x] **Create documentation for CSV file format**

### Task 7.3: Update Documentation
- [x] **Create README-REDDIT-LINKS.md**
  - [x] Add section for CSV-based downloads
  - [x] Add usage instructions
  - [x] Add troubleshooting guide

## Phase 8: GIF Handling & Organization (NEW)

### Task 8.1: GIF Folder Support
- [x] **Update `src/services/contentDownloadService.ts`**
  - [x] Add GIF folder creation
  - [x] Route GIF files to dedicated Gifs folder
  - [x] Update media type detection for GIFs

### Task 8.2: GIF Organization Scripts
- [x] **Create `src/scripts/moveGifsToGifsFolder.ts`**
  - [x] Move existing GIFs from Notes to Gifs folder
  - [x] Preserve subfolder structure
  - [x] Handle recursive directory scanning

### Task 8.3: Update Organization Scripts
- [x] **Update `src/scripts/organizeDownloads.ts`**
  - [x] Add Gifs folder to processing categories
  - [x] Include GIFs in similarity grouping
- [x] **Update `src/scripts/organizeDownloadsAdvanced.ts`**
  - [x] Add Gifs folder to pattern matching
  - [x] Support GIF organization by patterns

## Phase 9: Auto Download System (NEW)

### Task 9.1: Create Auto Download Script
- [x] **Create `src/scripts/autoDownload.ts`**
  - [x] Add automatic batch processing with configurable delays
  - [x] Add resume capability from any URL offset
  - [x] Add detailed progress tracking and batch statistics
  - [x] Add failed URL tracking for retry functionality
  - [x] Add command line options for batch size, delays, and directories

### Task 9.2: Auto Download Features
- [x] **Implement rate limiting**
  - [x] Configurable delays between batches (default: 20s)
  - [x] Configurable batch sizes (default: 20 URLs)
  - [x] Automatic progress tracking and statistics
- [x] **Add resume functionality**
  - [x] Start from any URL index with `--offset`
  - [x] Preserve failed URLs for retry
  - [x] Show next batch command for easy continuation
- [x] **Add comprehensive help system**
  - [x] Detailed help with examples
  - [x] Command line option documentation
  - [x] Usage examples and best practices

### Task 9.3: Integration with Existing System
- [x] **Integrate with existing services**
  - [x] Use `FileInputService` for CSV processing
  - [x] Use `ContentDownloadService` for content downloading
  - [x] Use existing error handling and logging
- [x] **Add npm scripts**
  - [x] Add `auto-download` script to package.json
  - [x] Add help command for auto download
  - [x] Document auto download usage

## Implementation Notes

### File Structure
```
reddit-links/             # Input directory with CSV files
├── sample.csv            # CSV files with key,URL format
├── batch2.csv            # Multiple files supported
└── your-files.csv        # Add more CSV files

failed-downloads.txt      # Output file for retry
downloads/                # Output directory
├── Images/
├── Videos/
└── Notes/
```

### Sample CSV File Format
```
# CSV files with key,URL format
key1,https://www.reddit.com/r/pics/comments/abc123/some_post/
key2,https://www.reddit.com/r/videos/comments/def456/another_post/
key3,https://www.reddit.com/r/AskReddit/comments/ghi789/comment/abc123/
```

### Dependencies to Reuse
- `downloadService.ts` - Existing download logic
- `fileUtils.ts` - File system operations
- `mediaUtils.ts` - Media processing and filename generation
- `folderOrganizer.ts` - Folder organization logic
- `redditApi.ts` - Reddit API integration
- `logger.ts` - Logging functionality

### Error Categories
1. **Invalid URL** - Skip and log
2. **Network Error** - Retry up to 3 times
3. **Rate Limited** - Wait and retry
4. **Content Not Found** - Skip and log
5. **File System Error** - Log and continue

### Success Criteria
- [x] Process 100+ URLs successfully
- [x] Organize content in correct folders
- [x] Generate meaningful filenames
- [x] Provide clear summary report
- [x] Support retry functionality
- [x] Handle errors gracefully
- [x] Auto download with rate limiting
- [x] Batch processing with delays
- [x] Resume capability from any offset 