# Task List: Reddit Media Saver App

## Relevant Files

- `package.json` - Main project configuration and dependencies
- `src/main.ts` - Electron main process entry point
- `src/App.tsx` - Main React application component
- `src/preload.ts` - Electron preload script for secure IPC
- `src/components/App.tsx` - Main application component
- `src/components/Auth.tsx` - OAuth2 authentication component
- `src/components/DownloadManager.tsx` - Download progress and management component
- `src/components/ContentBrowser.tsx` - Content browsing and search interface
- `src/services/redditApi.ts` - Reddit API integration service
- `src/services/authService.ts` - Authentication token management
- `src/services/downloadService.ts` - Media download and file system operations
- `src/services/storageService.ts` - File system organization and database management
- `src/utils/fileUtils.ts` - File system utility functions
- `src/utils/mediaUtils.ts` - Media processing utility functions
- `src/utils/folderOrganizer.ts` - Media type-based folder organization logic
- `src/utils/filenameSimilarity.ts` - Filename similarity detection for subfolder grouping
- `src/types/index.ts` - TypeScript type definitions
- `src/database/schema.sql` - SQLite database schema
- `src/database/index.ts` - Database connection and operations
- `electron-builder.json` - Electron build configuration
- `vite.config.ts` - Vite build configuration
- `build-electron.cjs` - Electron build script for main process compilation
- `tailwind.config.js` - Tailwind CSS configuration
- `src/styles/index.css` - Global styles and Tailwind imports
- `src/components/App.test.tsx` - Unit tests for main app component
- `src/services/redditApi.test.ts` - Unit tests for Reddit API service
- `src/services/downloadService.test.ts` - Unit tests for download service
- `src/services/storageService.test.ts` - Unit tests for storage service

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npm test` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Project Setup and Infrastructure
  - [x] 1.1 Initialize Electron + React + TypeScript project with Vite
  - [x] 1.2 Set up Tailwind CSS for styling
  - [x] 1.3 Configure ESLint and Prettier for code quality
  - [x] 1.4 Set up Jest and React Testing Library for testing
  - [x] 1.5 Configure Electron Builder for packaging
  - [x] 1.6 Create basic project structure and folder organization
  - [x] 1.7 Set up development scripts in package.json

- [x] 2.0 Reddit API Integration and Authentication
  - [x] 2.1 Research Reddit API endpoints for saved content and OAuth2
  - [x] 2.2 Create Reddit API service with proper rate limiting
  - [x] 2.3 Implement OAuth2 authentication flow
  - [x] 2.4 Create secure token storage and management
  - [x] 2.5 Implement token refresh mechanism
  - [x] 2.6 Add error handling for authentication failures
  - [x] 2.7 Create authentication component with login/logout UI

- [ ] 3.0 Content Download and Media Processing
  - [ ] 3.1 Implement saved posts fetching with pagination
  - [ ] 3.2 Implement saved comments fetching with pagination
  - [ ] 3.3 Create media detection and download logic
  - [ ] 3.4 Implement image download functionality
  - [ ] 3.5 Implement video download functionality (where possible)
  - [ ] 3.6 Add progress tracking for download operations
  - [ ] 3.7 Handle various media formats and file types
  - [ ] 3.8 Implement download queue management

- [ ] 4.0 File System Organization and Storage
  - [ ] 4.1 Design folder hierarchy structure for content organization by media type
  - [ ] 4.2 Implement media type-based folder creation (Images, Videos, Notes)
  - [ ] 4.3 Create subfolder organization for Images and Videos based on filename similarity
  - [ ] 4.4 Implement Notes categorization system (to be defined)
  - [ ] 4.5 Create descriptive filename generation logic
  - [ ] 4.6 Handle filename conflicts and duplicates
  - [ ] 4.7 Implement custom storage location selection
  - [ ] 4.8 Create JSON metadata storage for each item
  - [ ] 4.9 Generate HTML files for easy content viewing
  - [ ] 4.10 Handle edge cases (missing content, unsupported media types)

- [ ] 5.0 User Interface and Application Shell
  - [ ] 5.1 Create main application layout and navigation
  - [ ] 5.2 Implement download progress indicators and status display
  - [ ] 5.3 Create content browsing interface
  - [ ] 5.4 Add settings panel for configuration options
  - [ ] 5.5 Implement responsive design for different screen sizes
  - [ ] 5.6 Add keyboard navigation and accessibility features
  - [ ] 5.7 Create error message display and recovery UI

- [ ] 6.0 Search and Content Management
  - [ ] 6.1 Set up SQLite database with proper schema
  - [ ] 6.2 Implement content indexing and metadata storage
  - [ ] 6.3 Create search functionality with filters (subreddit, date, type)
  - [ ] 6.4 Implement content preview and thumbnail generation
  - [ ] 6.5 Add content statistics and organization overview
  - [ ] 6.6 Create incremental update detection for new saves
  - [ ] 6.7 Implement content export and backup functionality

- [ ] 7.0 Testing, Error Handling, and Polish
  - [ ] 7.1 Write unit tests for all services and utilities
  - [ ] 7.2 Create integration tests for API interactions
  - [ ] 7.3 Implement comprehensive error handling throughout the app
  - [ ] 7.4 Add logging and debugging capabilities
  - [ ] 7.5 Optimize performance for large content libraries
  - [ ] 7.6 Add application auto-update functionality
  - [ ] 7.7 Create user documentation and help system
  - [ ] 7.8 Final UI/UX polish and testing
  - [ ] 7.9 Prepare application for distribution and packaging 