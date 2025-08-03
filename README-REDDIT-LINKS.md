# Reddit Links File Download Feature

A simple feature to download Reddit content from a text file containing Reddit URLs.

## Quick Start

1. **Create CSV files** with Reddit URLs in the `reddit-links/` directory:
   ```
   # reddit-links/sample.csv
   video1,https://www.reddit.com/r/pics/comments/abc123/some_post/
   question1,https://www.reddit.com/r/videos/comments/def456/another_post/
   comment1,https://www.reddit.com/r/AskReddit/comments/ghi789/comment/abc123/
   ```

2. **Place your CSV files** in the `reddit-links/` directory

3. **Run the download script**:
   ```bash
   npm run process-links
   ```

4. **Check the results**:
   - Downloaded content will be in the `downloads/` folder
   - Failed downloads will be saved to `failed-downloads.txt`
   - Retry failed downloads with: `npm run retry-failed`

## Features

- ✅ **URL Validation**: Validates Reddit URLs before processing
- ✅ **Content Detection**: Automatically detects posts, comments, and media
- ✅ **Media Download**: Downloads images, videos, and other media files
- ✅ **Text Content**: Saves text posts and comments as `.txt` files
- ✅ **Organized Storage**: Uses existing folder structure (Images, Videos, Notes)
- ✅ **Smart Filenames**: Generates descriptive filenames using post titles
- ✅ **Error Handling**: Tracks failed downloads for retry
- ✅ **Progress Tracking**: Shows download progress and summary

## File Organization

```
reddit-links/        # Input CSV files
├── sample.csv       # Your Reddit URLs
├── batch1.csv       # Multiple files supported
└── batch2.csv       # All CSV files processed

downloads/            # Output organized content
├── Images/          # Downloaded images (JPG, PNG, etc.)
├── Videos/          # Downloaded videos (MP4, WebM, etc.)
├── Gifs/            # Downloaded GIFs (animated images)
└── Notes/           # Text content (posts/comments)
```

## CSV Format

The CSV files should have the following format:
```
key,URL
video1,https://www.reddit.com/r/pics/comments/abc123/some_post/
question1,https://www.reddit.com/r/videos/comments/def456/another_post/
comment1,https://www.reddit.com/r/AskReddit/comments/ghi789/comment/abc123/
```

- **First column**: Key/identifier (required)
- **Second column**: Reddit URL (required)
- **Comments**: Lines starting with `#` are ignored
- **Post titles**: Retrieved automatically from Reddit post data

## Supported URL Formats

- **Posts**: `https://www.reddit.com/r/subreddit/comments/postid/title/`
- **Comments**: `https://www.reddit.com/r/subreddit/comments/postid/title/comment/commentid/`
- **Media**: Automatically detected from post content

## Commands

- `npm run process-links` - Process URLs from CSV files
- `npm run retry-failed` - Retry failed downloads from `failed-downloads.txt`
- `npm run debug-api` - Test Reddit API access
- `npm run organize-downloads` - Basic file organization by similarity
- `npm run organize-downloads-advanced` - Advanced organization by patterns
- `npm run move-gifs` - Move GIFs to dedicated Gifs folder

## Error Handling

- Invalid URLs are skipped and logged
- Network errors are retried automatically
- Failed downloads are saved to `failed-downloads.txt`
- Rate limiting is handled with delays

## Example Output

```
🔗 Processing Reddit URLs from file...

📊 URL Validation Results:
   Total URLs found: 3
   Valid URLs: 2
   Invalid URLs: 1

🚀 Starting content download...

[1/2] 📥 Processing: https://www.reddit.com/r/pics/comments/abc123/some_post/
✅ Downloaded: Some_Amazing_Picture_pics.jpg

[2/2] 📥 Processing: https://www.reddit.com/r/AskReddit/comments/def456/question/
✅ Saved: What_is_the_most_useless_fact_you_know_AskReddit.txt

📊 Download Summary:
   Total processed: 2
   Successful: 2
   Failed: 0

📁 Downloaded content saved to: downloads/

✨ Processing complete!
```

## Notes

- No authentication required (uses public Reddit API)
- Respects Reddit's rate limits with built-in delays
- Works with both browser and Electron environments
- Leverages existing organization and filename generation logic 