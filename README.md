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
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Building
npm run build            # Build for production
npm run build:electron   # Build Electron main process
npm run electron-build   # Build complete Electron app

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run type-check       # Run TypeScript type checking
```

### Project Structure

```
src/
├── components/          # React components
│   ├── App.tsx         # Main application component
│   ├── Auth.tsx        # OAuth2 authentication
│   ├── ContentBrowser.tsx # Content browsing interface
│   ├── DownloadManager.tsx # Download progress management
│   ├── SettingsPanel.tsx # Configuration options
│   ├── DebugPanel.tsx  # Development debugging tools
│   └── ErrorBoundary.tsx # Error handling
├── services/           # Business logic and API services
│   ├── authService.ts  # Reddit OAuth2 authentication
│   ├── contentService.ts # Reddit API content fetching
│   ├── downloadService.ts # Media download handling
│   ├── storageService.ts # File system organization
│   └── databaseService.ts # Database operations
├── utils/              # Utility functions
│   ├── fileUtils.ts    # File system operations
│   ├── mediaUtils.ts   # Media processing utilities
│   ├── folderOrganizer.ts # Folder organization logic
│   ├── filenameSimilarity.ts # Filename grouping
│   └── logger.ts       # Logging utilities
├── database/           # Database schema and operations
│   ├── index.ts        # Database service implementation
│   └── schema.sql      # SQLite schema
├── types/              # TypeScript type definitions
└── styles/             # Global styles
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REDDIT_CLIENT_ID` | Reddit OAuth2 client ID | Yes |
| `REDDIT_CLIENT_SECRET` | Reddit OAuth2 client secret | Yes |
| `NODE_ENV` | Environment (development/production) | No |

### Browser vs Electron

The app is designed to work in both browser and Electron environments:

- **Browser**: Uses in-memory storage and localStorage for persistence
- **Electron**: Uses SQLite database and file system for full functionality

### Troubleshooting

#### Blank Page Issue
If you see a blank page, check:
1. Reddit API credentials are properly set in `.env`
2. No console errors in browser developer tools
3. Development server is running on the correct port

#### Authentication Issues
- Ensure redirect URI matches exactly: `http://localhost:3000/auth/callback`
- Check that Reddit app is configured as "web app" type
- Verify client ID and secret are correct

#### Build Issues
- Run `npm run type-check` to verify TypeScript compilation
- Check for missing dependencies with `npm install`
- Clear build cache: `npm run clean`

## Configuration

The app supports various configuration options:

- **File Organization**: Choose how files are organized (by subreddit, author, etc.)
- **Storage Location**: Select custom download directory
- **File Naming**: Configure filename patterns
- **Download Settings**: Set concurrent download limits, retry behavior

## Testing

The app includes comprehensive tests:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- src/utils/mediaUtils.test.ts
npm test -- src/services/redditApi.test.ts

# Run with coverage
npm run test:coverage
```

## Building for Production

### Web Build
```bash
npm run build
```

### Electron Build
```bash
npm run electron-build
```

### Distribution
```bash
npm run dist
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new functionality
- Use ESLint and Prettier for code formatting
- Update documentation for new features
- Test in both browser and Electron environments

## Recent Updates

### v0.1.0 - Initial Release
- ✅ OAuth2 authentication with Reddit
- ✅ Content browsing and search
- ✅ Media download functionality
- ✅ File organization system
- ✅ Browser and Electron compatibility
- ✅ Comprehensive error handling
- ✅ Development debugging tools

## License

[Add your license here]
