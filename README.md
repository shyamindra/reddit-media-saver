# Reddit Media Saver App

A desktop application built with Electron, React, and TypeScript that allows users to download and organize their saved Reddit content locally.

## Features

- **OAuth2 Authentication**: Secure login with Reddit API
- **Content Download**: Download saved posts and comments with media
- **Smart File Organization**: 
  - Automatic folder organization by media type (Images, Videos, Notes)
  - Subfolder grouping based on filename similarity
  - **Descriptive filenames using Reddit post titles** (e.g., `Amazing_Reddit_Post_subreddit.jpg`)
- **Search & Management**: SQLite database for content indexing and search
- **Progress Tracking**: Real-time download progress and status
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Browser & Desktop**: Works in both browser and Electron environments

## File Naming Convention

Downloaded files are named using the Reddit post title as the primary identifier:

- **Format**: `title_subreddit.extension`
- **Example**: `Amazing_Reddit_Post_funny.jpg`
- **Benefits**: 
  - Easy content identification
  - Descriptive filenames
  - Clean organization
  - Conflict prevention with subreddit suffix

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: Electron + Node.js (with browser fallback)
- **Build Tool**: Vite
- **Database**: SQLite with better-sqlite3 (in-memory for browser)
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint + Prettier

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd reddit-saver-app
```

2. Install dependencies:
```bash
npm install
```

3. **Set up Reddit API credentials** (Required):
   
   a. Go to [Reddit App Preferences](https://www.reddit.com/prefs/apps)
   b. Click "Create App" or "Create Another App"
   c. Fill in the form:
      - **Name**: "Reddit Media Saver"
      - **App type**: "web app"
      - **Description**: "Personal media saver"
      - **Redirect URI**: `http://localhost:3000/auth/callback`
   d. Copy the client ID (under the app name)
   e. Copy the client secret (click "secret")

4. Create a `.env` file in the project root:
```bash
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
```

5. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

### First Run

1. Open the app in your browser
2. Click "Login with Reddit" to authenticate
3. Grant the required permissions (history, read)
4. Start browsing and downloading your saved content!

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run electron-dev     # Start Electron app in development mode

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run type-check       # Check TypeScript types

# Building
npm run build            # Build for production
npm run build-electron   # Build Electron app
npm run preview          # Preview production build

# Linting
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
```

## File Organization Commands

The project includes several powerful scripts for organizing downloaded content, managing video files, and maintaining a clean file structure.

### Video Organization

```bash
# Basic similarity-based organization
npm run organize-downloads

# Advanced pattern-based organization
npm run organize-downloads-advanced

# Custom celebrity-based organization (RECOMMENDED)
npm run organize-videos-custom
```

**What each command does:**

- **`organize-downloads`**: Groups files by filename similarity using basic algorithms
- **`organize-downloads-advanced`**: Uses pattern matching to group related files
- **`organize-videos-custom`**: Organizes videos by celebrity names and moves remaining files to "other" folder

### URL Processing & Deduplication

```bash
# Deduplicate video URLs and select highest quality
npm run deduplicate-urls

# Download videos from deduplicated list
npm run ytdlp-download

# Download with custom naming (using post titles)
npm run ytdlp-download -- --deduplicated
```

**What each command does:**

- **`deduplicate-urls`**: Removes duplicate URLs and selects highest quality versions
- **`ytdlp-download`**: Downloads videos from the extracted URL list
- **`ytdlp-download --deduplicated`**: Downloads with post titles as filenames

### Reddit Links Processing

```bash
# Process all Reddit links
npm run process-links

# Test mode (dry run)
npm run process-links:test

# Batch processing
npm run process-links:batch

# High-quality processing
npm run process-links:high-quality

# Show help for process-links command
npm run process-links:help

# Predefined batch sizes
npm run process-links:batch20    # Process 20 URLs
npm run process-links:batch50    # Process 50 URLs
npm run process-links:batch100   # Process 100 URLs
```

**What each command does:**

- **`process-links`**: Processes all URLs from Reddit links files
- **`process-links:test`**: Test mode without making changes
- **`process-links:batch`**: Batch processing for large datasets
- **`process-links:high-quality`**: Downloads highest quality versions
- **`process-links:help`**: Shows help and available options
- **`process-links:batch20/50/100`**: Predefined batch sizes for convenience

### File Management

```bash
# Move GIFs to dedicated folder
npm run move-gifs

# Fix corrupted video files
npm run fix-corrupted-files

# Fix corrupted video files (advanced)
npm run fix-corrupted-video-files

# Fix video files
npm run fix-video-files

# Extract videos from text files
npm run extract-videos-from-text

# Auto download functionality
npm run auto-download
```

**What each command does:**

- **`move-gifs`**: Moves GIF files to a dedicated GIFs folder
- **`fix-corrupted-files`**: Attempts to repair corrupted files
- **`fix-corrupted-video-files`**: Advanced video file repair
- **`fix-video-files`**: General video file maintenance
- **`extract-videos-from-text`**: Extract video URLs from text files
- **`auto-download`**: Automatic download functionality

### Analysis & Debugging

```bash
# Analyze large text files
npm run analyze-large-text-files

# Analyze video files
npm run analyze-video-files

# Check video integrity
npm run check-video-integrity

# Debug Reddit API
npm run debug-reddit-api

# Test enhanced video download
npm run test-enhanced-video

# Retry failed downloads (general)
npm run retry-failed
```

**What each command does:**

- **`analyze-large-text-files`**: Analyzes and reports on large text files
- **`analyze-video-files`**: Analyzes video file properties and metadata
- **`check-video-integrity`**: Verifies video files are not corrupted
- **`debug-reddit-api`**: Tests Reddit API connectivity and responses
- **`test-enhanced-video`**: Tests enhanced video download functionality
- **`retry-failed`**: Retries failed downloads (general retry mechanism)

### Advanced Organization

```bash
# Organize downloads (advanced)
npm run organize-downloads-advanced

# Recover videos
npm run recover-videos

# Retry failed downloads
npm run retry-failed-downloads

# Retry failed extraction
npm run retry-failed-extraction
```

**What each command does:**

- **`organize-downloads-advanced`**: Advanced file organization with pattern matching
- **`recover-videos`**: Attempts to recover partially downloaded videos
- **`retry-failed-downloads`**: Retries previously failed video downloads
- **`retry-failed-extraction`**: Retries failed URL extraction attempts

### Quick Organization Workflow

For a complete file organization workflow:

```bash
# 1. Deduplicate URLs (if you have extracted URLs)
npm run deduplicate-urls

# 2. Download videos with custom naming
npm run ytdlp-download -- --deduplicated

# 3. Organize videos by celebrity names
npm run organize-videos-custom

# 4. Move GIFs to dedicated folder
npm run move-gifs

# 5. Fix any corrupted files
npm run fix-corrupted-files
```

This workflow will give you a clean, organized file structure with:
- Deduplicated, high-quality videos
- Celebrity-based organization
- Separate GIF folder
- Repaired corrupted files

## Video URL Extraction & Download Workflow

This section explains how to extract video URLs from Reddit saved links CSV files and download the actual video content.

### Prerequisites

1. **Reddit Saved Links CSV Files**: Place your Reddit saved links CSV files in the `reddit-links/` directory
2. **CSV Format**: Files should contain Reddit URLs in one of these formats:
   ```csv
   # Format 1: key, URL
   video1,https://www.reddit.com/r/subreddit/comments/id/title/
   video2,https://www.reddit.com/r/subreddit/comments/id/title/
   
   # Format 2: id, permalink
   1,https://www.reddit.com/r/subreddit/comments/id/title/
   2,https://www.reddit.com/r/subreddit/comments/id/title/
   ```

### Step 1: Extract Video URLs from Reddit Posts

```bash
# Extract video URLs from all CSV files in reddit-links/
npm run extract-all-videos
```

**What this does:**
- Reads all CSV files from `reddit-links/` directory
- Processes each Reddit URL to extract video content
- Supports multiple video platforms:
  - **Reddit videos** (v.redd.it)
  - **RedGIFs** (media.redgifs.com, watch.redgifs.com)
  - **Other video platforms**
- Saves results to:
  - `all-extracted-video-urls.txt` - Complete list with post titles
  - `extracted-video-urls-batch-*.txt` - Batch files for large datasets
  - `failed-extraction-requests.txt` - Failed requests for retry

**Example Output:**
```
📁 Found 2 CSV files in reddit-links/
📄 Processing: saved_posts.csv
📄 Processing: saved_comments.csv
🎬 Processing post 1/100: "Amazing Reddit Video"
✅ Found 2 video URLs
🎬 Processing post 2/100: "Another Great Video"
✅ Found 1 video URL
...
💾 Saved batch 1: 50 posts with video URLs to extracted-video-urls-batch-1.txt
💾 Saved final batch: 100 posts with video URLs to extracted-video-urls-batch-final.txt
💾 Saved all URLs to all-extracted-video-urls.txt
```

### Step 2: Deduplicate and Select Best Quality

```bash
# Remove duplicates and select highest quality versions
npm run deduplicate-urls
```

**What this does:**
- Removes duplicate video URLs
- Selects highest quality versions (1080p > 720p > 480p, etc.)
- Prioritizes RedGIFs over Reddit videos (typically better quality)
- Saves deduplicated list to `deduplicated-video-urls.txt`

**Example Output:**
```
📄 Loaded 912 URLs from all-extracted-video-urls.txt
🔍 Processing 912 URLs...
✅ Found 488 unique videos
💾 Saved deduplicated URLs to deduplicated-video-urls.txt
```

### Step 3: Download Videos

#### Option A: Download with Custom Naming (Recommended)

```bash
# Download videos using post titles as filenames
npm run ytdlp-download -- --deduplicated
```

**What this does:**
- Downloads videos from `deduplicated-video-urls.txt`
- Uses Reddit post titles as filenames
- Handles duplicate filenames by appending numbers
- Saves to `downloads/Videos/` directory

#### Option B: Download with Default Naming

```bash
# Download videos with default yt-dlp naming
npm run ytdlp-download
```

**What this does:**
- Downloads videos from `all-extracted-video-urls.txt`
- Uses yt-dlp default naming convention
- Saves to `downloads/Videos/` directory

### Step 4: Organize Downloaded Videos

```bash
# Organize videos by celebrity names and move rest to "other" folder
npm run organize-videos-custom
```

**What this does:**
- Creates celebrity-based folders (e.g., `ana-de-armas/`, `charlotte-le-bon/`)
- Moves remaining videos to `other/` folder
- Provides clean, organized structure

### Complete Workflow Example

Here's a complete example of extracting and downloading videos from Reddit saved links:

```bash
# 1. Extract video URLs from CSV files
npm run extract-all-videos

# 2. Deduplicate and select best quality
npm run deduplicate-urls

# 3. Download videos with custom naming
npm run ytdlp-download -- --deduplicated

# 4. Organize videos by celebrity names
npm run organize-videos-custom

# 5. Move GIFs to dedicated folder
npm run move-gifs

# 6. Fix any corrupted files
npm run fix-corrupted-files
```

### Advanced Options

#### Batch Processing for Large Datasets

```bash
# Process only first 50 URLs (for testing)
npm run extract-all-videos -- --limit 50

# Process URLs starting from offset 100
npm run extract-all-videos -- --offset 100 --limit 50

# Add delay between requests (avoid rate limiting)
npm run extract-all-videos -- --delay 2000
```

#### Retry Failed Operations

```bash
# Retry failed URL extractions
npm run retry-failed-extraction

# Retry failed video downloads
npm run retry-failed-downloads
```

#### Quality Selection

```bash
# Test quality selection for specific URLs
npm run test-quality-selection

# Test video download functionality
npm run test-video-download
```

### Output Files

After running the extraction workflow, you'll have:

- **`all-extracted-video-urls.txt`** - Complete list with post titles
- **`deduplicated-video-urls.txt`** - Clean, high-quality URLs
- **`failed-extraction-requests.txt`** - Failed requests for retry
- **`downloads/Videos/`** - Downloaded video files
- **`downloads/Videos/[celebrity-name]/`** - Organized celebrity folders
- **`downloads/Videos/other/`** - Miscellaneous videos

### Troubleshooting

#### Rate Limiting Issues
- Use `--delay` option to add delays between requests
- Reddit API has rate limits, so processing large datasets takes time

#### Failed Downloads
- Check `failed-video-downloads.txt` for failed URLs
- Use `npm run retry-failed-downloads` to retry
- Some videos may be deleted or private

#### Memory Issues with Large Datasets
- Use batch processing with `--limit` and `--offset`
- Process in smaller chunks to avoid memory issues

## Troubleshooting

### Common Issues

#### 1. Blank Page on App Load

**Symptoms**: App loads but shows a completely blank page

**Causes & Solutions**:

##### Missing Reddit API Credentials
- **Cause**: Reddit API credentials not configured
- **Solution**: 
  1. Create a `.env` file in the project root
  2. Add your Reddit API credentials:
     ```
     REDDIT_CLIENT_ID=your_client_id_here
     REDDIT_CLIENT_SECRET=your_client_secret_here
     ```
  3. Restart the development server

##### CSS/Layout Issues
- **Cause**: CSS conflicts or layout problems
- **Solution**: 
  1. Clear browser cache
  2. Check browser console for CSS errors
  3. Ensure all CSS files are loading properly

##### JavaScript Errors
- **Cause**: Runtime errors preventing app initialization
- **Solution**:
  1. Open browser developer tools (F12)
  2. Check Console tab for error messages
  3. Check Network tab for failed resource loads

#### 2. Authentication Issues

**Symptoms**: Cannot log in to Reddit, authentication fails

**Causes & Solutions**:

##### Incorrect Reddit App Configuration
- **Cause**: Reddit app not configured correctly
- **Solution**:
  1. Go to [Reddit App Preferences](https://www.reddit.com/prefs/apps)
  2. Ensure app type is set to "web app"
  3. Verify redirect URI is exactly: `http://localhost:3000/auth/callback`
  4. Check that client ID and secret are correct

##### Network/Port Issues
- **Cause**: Development server not running on expected port
- **Solution**:
  1. Check terminal for actual port number (may be 5174, 5175, etc.)
  2. Update redirect URI in Reddit app to match actual port
  3. Ensure no firewall blocking localhost connections

#### 3. Development Server Issues

**Symptoms**: `npm run dev` fails or server won't start

**Causes & Solutions**:

##### Port Already in Use
- **Cause**: Another process using port 5173
- **Solution**:
  1. Check what's using the port: `lsof -i :5173`
  2. Kill the process or let Vite use a different port
  3. Update redirect URI in Reddit app if port changes

##### Missing Dependencies
- **Cause**: Node modules not installed or corrupted
- **Solution**:
  1. Delete `node_modules` folder
  2. Delete `package-lock.json`
  3. Run `npm install`
  4. Restart development server

##### TypeScript Errors
- **Cause**: Type errors preventing compilation
- **Solution**:
  1. Run `npm run type-check` to see errors
  2. Fix TypeScript errors in code
  3. Ensure all imports are correct

#### 4. Build Issues

**Symptoms**: `npm run build` fails

**Causes & Solutions**:

##### TypeScript Compilation Errors
- **Cause**: Type errors in production build
- **Solution**:
  1. Run `npm run type-check` to identify errors
  2. Fix all TypeScript errors
  3. Ensure all dependencies are properly typed

##### Missing Environment Variables
- **Cause**: Required environment variables not set
- **Solution**:
  1. Ensure `.env` file exists with required variables
  2. Check that variables are properly named
  3. Restart the build process

## API Reference

For detailed API documentation, see [API.md](./API.md).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
