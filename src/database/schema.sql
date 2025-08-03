-- Reddit Media Saver Database Schema
-- Version: 1.0

-- Content table - stores basic content information
CREATE TABLE IF NOT EXISTS content (
    id TEXT PRIMARY KEY,                    -- Reddit content ID
    type TEXT NOT NULL,                    -- 'post' or 'comment'
    title TEXT NOT NULL,                   -- Content title
    subreddit TEXT NOT NULL,              -- Subreddit name
    author TEXT NOT NULL,                  -- Author username
    url TEXT NOT NULL,                    -- Original Reddit URL
    permalink TEXT NOT NULL,              -- Reddit permalink
    created_utc INTEGER NOT NULL,         -- Unix timestamp
    score INTEGER NOT NULL DEFAULT 0,     -- Reddit score
    num_comments INTEGER DEFAULT 0,       -- Number of comments
    upvote_ratio REAL DEFAULT 0.0,       -- Upvote ratio
    selftext TEXT,                        -- Text content for text posts
    body TEXT,                           -- Comment body
    domain TEXT,                         -- Domain for link posts
    is_video BOOLEAN DEFAULT FALSE,      -- Whether content is video
    saved_at INTEGER NOT NULL,            -- When content was saved
    created_at INTEGER NOT NULL DEFAULT (unixepoch()), -- When record was created
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())  -- When record was last updated
);

-- Media table - stores media information
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id TEXT NOT NULL,             -- Foreign key to content.id
    type TEXT NOT NULL,                  -- 'image', 'video', 'gif', 'text', 'link'
    url TEXT,                           -- Media URL
    thumbnail_url TEXT,                  -- Thumbnail URL
    local_path TEXT,                     -- Local file path
    file_size INTEGER,                   -- File size in bytes
    mime_type TEXT,                     -- MIME type
    width INTEGER,                       -- Image/video width
    height INTEGER,                      -- Image/video height
    duration INTEGER,                    -- Video duration in seconds
    extension TEXT,                      -- File extension
    downloaded_at INTEGER,               -- When media was downloaded
    download_status TEXT DEFAULT 'pending', -- 'pending', 'downloading', 'completed', 'failed'
    error_message TEXT,                  -- Error message if download failed
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

-- Tags table - for content categorization
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,           -- Tag name
    color TEXT DEFAULT '#3B82F6',       -- Tag color
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Content tags junction table
CREATE TABLE IF NOT EXISTS content_tags (
    content_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (content_id, tag_id),
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Search history table
CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,                 -- Search query
    filters TEXT,                        -- JSON string of applied filters
    results_count INTEGER NOT NULL,      -- Number of results
    searched_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Download queue table
CREATE TABLE IF NOT EXISTS download_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id TEXT NOT NULL,            -- Foreign key to content.id
    priority INTEGER DEFAULT 0,          -- Download priority (higher = more important)
    status TEXT DEFAULT 'pending',       -- 'pending', 'downloading', 'completed', 'failed', 'cancelled'
    retry_count INTEGER DEFAULT 0,       -- Number of retry attempts
    max_retries INTEGER DEFAULT 3,       -- Maximum retry attempts
    error_message TEXT,                  -- Error message if failed
    queued_at INTEGER NOT NULL DEFAULT (unixepoch()),
    started_at INTEGER,                  -- When download started
    completed_at INTEGER,                -- When download completed
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,                -- Setting key
    value TEXT NOT NULL,                 -- Setting value (JSON string)
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Statistics table
CREATE TABLE IF NOT EXISTS statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,                  -- Date in YYYY-MM-DD format
    total_content INTEGER DEFAULT 0,     -- Total content count
    total_images INTEGER DEFAULT 0,      -- Total images count
    total_videos INTEGER DEFAULT 0,      -- Total videos count
    total_notes INTEGER DEFAULT 0,       -- Total notes count
    total_size INTEGER DEFAULT 0,        -- Total size in bytes
    downloads_completed INTEGER DEFAULT 0, -- Downloads completed today
    downloads_failed INTEGER DEFAULT 0,   -- Downloads failed today
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_subreddit ON content(subreddit);
CREATE INDEX IF NOT EXISTS idx_content_author ON content(author);
CREATE INDEX IF NOT EXISTS idx_content_created_utc ON content(created_utc);
CREATE INDEX IF NOT EXISTS idx_content_saved_at ON content(saved_at);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_score ON content(score);

CREATE INDEX IF NOT EXISTS idx_media_content_id ON media(content_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
CREATE INDEX IF NOT EXISTS idx_media_download_status ON media(download_status);
CREATE INDEX IF NOT EXISTS idx_media_local_path ON media(local_path);

CREATE INDEX IF NOT EXISTS idx_content_tags_content_id ON content_tags(content_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_id ON content_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_download_queue_status ON download_queue(status);
CREATE INDEX IF NOT EXISTS idx_download_queue_priority ON download_queue(priority);
CREATE INDEX IF NOT EXISTS idx_download_queue_content_id ON download_queue(content_id);

CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON search_history(searched_at);

-- Full-text search index for content
CREATE VIRTUAL TABLE IF NOT EXISTS content_fts USING fts5(
    title,
    selftext,
    body,
    subreddit,
    author,
    content='content',
    content_rowid='rowid'
);

-- Triggers to maintain full-text search index
CREATE TRIGGER IF NOT EXISTS content_ai AFTER INSERT ON content BEGIN
    INSERT INTO content_fts(rowid, title, selftext, body, subreddit, author)
    VALUES (new.rowid, new.title, new.selftext, new.body, new.subreddit, new.author);
END;

CREATE TRIGGER IF NOT EXISTS content_ad AFTER DELETE ON content BEGIN
    INSERT INTO content_fts(content_fts, rowid, title, selftext, body, subreddit, author)
    VALUES('delete', old.rowid, old.title, old.selftext, old.body, old.subreddit, old.author);
END;

CREATE TRIGGER IF NOT EXISTS content_au AFTER UPDATE ON content BEGIN
    INSERT INTO content_fts(content_fts, rowid, title, selftext, body, subreddit, author)
    VALUES('delete', old.rowid, old.title, old.selftext, old.body, old.subreddit, old.author);
    INSERT INTO content_fts(rowid, title, selftext, body, subreddit, author)
    VALUES (new.rowid, new.title, new.selftext, new.body, new.subreddit, new.author);
END;

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
('storage.basePath', '"~/Downloads/RedditSaver"'),
('storage.organizeBySubreddit', 'true'),
('storage.organizeByAuthor', 'false'),
('storage.createSubfolders', 'true'),
('storage.generateHtmlFiles', 'true'),
('download.maxConcurrent', '3'),
('download.timeout', '30000'),
('download.retries', '3'),
('download.skipExisting', 'true'),
('ui.theme', '"light"'),
('ui.defaultView', '"grid"'),
('search.defaultLimit', '50'),
('search.maxResults', '1000');

-- Insert default tags
INSERT OR IGNORE INTO tags (name, color) VALUES
('favorite', '#EF4444'),
('important', '#F59E0B'),
('funny', '#10B981'),
('interesting', '#3B82F6'),
('saved', '#8B5CF6'); 