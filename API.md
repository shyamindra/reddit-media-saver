# API Documentation

## Reddit API Integration

### Authentication
The app uses Reddit's OAuth2 flow for authentication.

**Required Scopes:**
- `history` - Access to saved posts and comments
- `read` - Read access to public content

**OAuth2 Flow:**
1. User clicks "Login with Reddit"
2. App redirects to Reddit OAuth page
3. User authorizes the app
4. Reddit redirects back with authorization code
5. App exchanges code for access token
6. App stores token securely

### API Endpoints Used

#### Saved Content
- `GET /user/{username}/saved` - Get user's saved posts
- `GET /user/{username}/saved/comments` - Get user's saved comments

#### Post Details
- `GET /comments/{post_id}` - Get post details and comments
- `GET /r/{subreddit}/comments/{post_id}` - Get post from specific subreddit

#### Media Detection
- Parse post content for media URLs
- Support for images (imgur, reddit, direct links)
- Support for videos (reddit, v.redd.it, youtube)
- Support for text content

## Internal Services

### AuthService
Handles Reddit OAuth2 authentication and token management.

```typescript
interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  token: OAuthToken | null;
  isLoading: boolean;
  error: string | null;
}
```

### ContentService
Manages Reddit content fetching and processing.

```typescript
interface ContentItem {
  id: string;
  type: 'post' | 'comment';
  title: string;
  subreddit: string;
  author: string;
  url: string;
  permalink: string;
  created_utc: number;
  media: {
    type: 'image' | 'video' | 'text';
    url: string;
  };
  metadata: {
    score: number;
    num_comments: number;
    upvote_ratio: number;
  };
}
```

### DownloadService
Handles media download and file processing.

```typescript
interface DownloadProgress {
  itemId: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
}
```

### StorageService
Manages file system organization and metadata storage.

```typescript
interface StorageConfig {
  basePath: string;
  organizeBySubreddit: boolean;
  organizeByAuthor: boolean;
  createSubfolders: boolean;
  generateHtmlFiles: boolean;
}
```

### DatabaseService
Handles content indexing and search functionality.

```typescript
interface SearchFilters {
  subreddit?: string;
  author?: string;
  mediaType?: string;
  dateFrom?: number;
  dateTo?: number;
  minScore?: number;
  tags?: string[];
}
```

## File Organization

### Directory Structure
```
downloads/
├── Images/
│   ├── Group1/
│   │   ├── Amazing_Post_funny.jpg
│   │   └── Another_Post_memes.png
│   └── Group2/
├── Videos/
│   └── Video_Content_videos.mp4
├── Notes/
│   └── Text_Post_askreddit.html
└── metadata/
    ├── post1.json
    └── post2.json
```

### Filename Convention
- **Format**: `title_subreddit.extension`
- **Example**: `Amazing_Reddit_Post_funny.jpg`
- **Benefits**: Descriptive, organized, conflict-free

## Error Handling

### Common Error Types
- **Authentication Errors**: Invalid credentials, expired tokens
- **Network Errors**: API rate limits, connection issues
- **File System Errors**: Permission issues, disk space
- **Media Processing Errors**: Unsupported formats, corrupted files

### Error Recovery
- Automatic token refresh
- Retry mechanisms for failed downloads
- Graceful degradation for unsupported content
- User-friendly error messages

## Browser vs Electron

### Browser Environment
- In-memory storage for content
- localStorage for persistence
- Limited file system access
- Web-based authentication flow

### Electron Environment
- Full file system access
- SQLite database storage
- Native authentication flow
- Complete download capabilities

## Development Tools

### Debug Panel
- Real-time app state monitoring
- Service status indicators
- Error log viewing
- Performance metrics

### Logging
- Winston-based logging system
- Console and file output
- Error tracking and reporting
- Performance monitoring 