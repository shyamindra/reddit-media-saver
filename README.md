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

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Electron + Node.js
- **Build Tool**: Vite
- **Database**: SQLite with better-sqlite3
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint + Prettier

## Development

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

3. Start development server:
```bash
npm run dev
```

### Testing

Run all tests:
```bash
npm test
```

Run specific test files:
```bash
npm test -- src/utils/mediaUtils.test.ts
```

### Building

Build for production:
```bash
npm run build
```

Build Electron app:
```bash
npm run build:electron
```

## Project Structure

```
src/
├── components/          # React components
├── services/           # Business logic and API services
├── utils/              # Utility functions
├── database/           # Database schema and operations
├── types/              # TypeScript type definitions
└── styles/             # Global styles
```

## Configuration

The app supports various configuration options for file organization and download behavior. See the settings panel in the application for available options.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

[Add your license here]
