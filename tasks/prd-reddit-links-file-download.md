# PRD: Reddit Links File Download Feature

## Introduction/Overview

This feature allows users to download Reddit content from a simple text file containing Reddit URLs. The system will process each link, download the content (posts, comments, or media), and organize it using the existing folder structure and naming conventions. This provides a simple alternative to the complex OAuth authentication flow while leveraging the existing content organization system.

## Goals

1. **Simple Input Processing**: Read Reddit URLs from a text file and process them sequentially
2. **Content Download**: Download post content, comment text, and media files from each URL
3. **Organized Storage**: Use existing folder organization (Images, Videos, Notes) and filename generation
4. **Error Handling**: Track failed downloads and provide retry capability
5. **Progress Feedback**: Show simple progress and summary of results

## User Stories

1. **As a user**, I want to place a text file with Reddit URLs in the project directory so that I can easily specify which content to download
2. **As a user**, I want the system to process each URL and download the content so that I can save Reddit posts locally
3. **As a user**, I want downloaded content to be organized in folders by type so that I can easily find and manage my saved content
4. **As a user**, I want to see a summary of successful and failed downloads so that I know what was processed
5. **As a user**, I want to retry failed downloads so that I can handle temporary network issues

## Functional Requirements

1. **File Input**: The system must read Reddit URLs from a text file (one URL per line) located in the project directory
2. **URL Validation**: The system must validate that each line contains a valid Reddit URL before processing
3. **Content Detection**: The system must detect whether each URL points to a post, comment, or media content
4. **Post Content Download**: For posts, the system must download the main post content (text, images, videos)
5. **Comment Content Download**: For comments, the system must download the comment text content
6. **Media Download**: For media links, the system must download the media file (image/video)
7. **Folder Organization**: The system must organize downloaded content using existing logic:
   - Images → `Images/` folder with subfolder grouping by filename similarity
   - Videos → `Videos/` folder with subfolder grouping by filename similarity  
   - Text content → `Notes/` folder
8. **Filename Generation**: The system must use existing filename generation logic (title_subreddit.extension format)
9. **Progress Tracking**: The system must display simple progress (e.g., "Processing 5/20 URLs...")
10. **Summary Report**: The system must provide a summary showing:
    - Total URLs processed
    - Successful downloads count
    - Failed downloads count
    - List of failed URLs for retry
11. **Error Logging**: The system must log failed downloads with error reasons
12. **Retry Capability**: The system must support retrying failed downloads from a separate file

## Non-Goals (Out of Scope)

- OAuth authentication (assumes user is already authenticated)
- Complex UI - this will be a simple command-line or basic web interface
- Real-time progress updates - simple summary is sufficient
- Multiple file format support - text file only for now
- Download queue management - sequential processing only
- Comment threading - only main comment content, not replies
- Rate limiting handling - basic retry on failure

## Design Considerations

- **Simple Interface**: Command-line script or basic web form to upload/process the text file
- **Existing Integration**: Leverage existing `downloadService`, `fileUtils`, `mediaUtils`, and `folderOrganizer` modules
- **File Location**: Place input file in project root as `reddit-links.txt`
- **Output Structure**: Use existing folder organization system from the main app

## Technical Considerations

- **Dependencies**: Reuse existing services (`downloadService`, `redditApi`, `fileUtils`, `mediaUtils`)
- **Authentication**: Assume user is already logged in (use existing auth tokens if available)
- **Error Handling**: Use existing error handling patterns from the main app
- **File Processing**: Simple line-by-line text file reading
- **URL Parsing**: Use existing Reddit URL parsing logic from `redditApi`

## Success Metrics

- **Functionality**: Successfully download content from 90%+ of valid Reddit URLs
- **Organization**: All downloaded content properly organized in correct folders
- **Error Handling**: Failed downloads are properly logged and retryable
- **Performance**: Process 100+ URLs without significant performance issues

## Open Questions

1. Should the system create a separate output directory for each batch run, or append to existing folders?
2. Should the system support processing multiple text files in one session?
3. How should the system handle very large text files (1000+ URLs)?
4. Should the system preserve the original Reddit post metadata (JSON files) like the main app?

## Implementation Priority

1. **Phase 1**: Basic text file reading and URL validation
2. **Phase 2**: Content download integration with existing services
3. **Phase 3**: Folder organization and filename generation
4. **Phase 4**: Progress tracking and summary reporting
5. **Phase 5**: Error handling and retry functionality 