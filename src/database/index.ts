import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import type { ContentItem } from '../services/contentService';
import type { ContentMetadata } from '../types';

export interface DatabaseConfig {
  dbPath: string;
  verbose?: boolean;
}

export interface ContentRecord {
  id: string;
  type: 'post' | 'comment';
  title: string;
  subreddit: string;
  author: string;
  url: string;
  permalink: string;
  created_utc: number;
  score: number;
  num_comments?: number;
  upvote_ratio?: number;
  selftext?: string;
  body?: string;
  domain?: string;
  is_video: boolean;
  saved_at: number;
  created_at: number;
  updated_at: number;
}

export interface MediaRecord {
  id: number;
  content_id: string;
  type: string;
  url?: string;
  thumbnail_url?: string;
  local_path?: string;
  file_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  duration?: number;
  extension?: string;
  downloaded_at?: number;
  download_status: string;
  error_message?: string;
  created_at: number;
}

export interface SearchFilters {
  subreddit?: string;
  author?: string;
  mediaType?: string;
  dateFrom?: number;
  dateTo?: number;
  minScore?: number;
  tags?: string[];
}

export interface SearchResult {
  content: ContentRecord;
  media: MediaRecord[];
  tags: string[];
  relevance: number;
}

export class DatabaseService {
  private db: Database.Database;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.db = new Database(config.dbPath, {
      verbose: config.verbose ? console.log : undefined
    });
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    
    // Set busy timeout
    this.db.pragma('busy_timeout = 5000');
  }

  /**
   * Initialize database with schema
   */
  public async initialize(): Promise<void> {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');
      
      // Split schema into individual statements
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      // Execute each statement
      for (const statement of statements) {
        if (statement.length > 0) {
          this.db.exec(statement);
        }
      }

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Insert or update content
   */
  public insertContent(content: ContentItem, savedAt: number = Date.now()): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO content (
        id, type, title, subreddit, author, url, permalink, created_utc,
        score, num_comments, upvote_ratio, selftext, body, domain, is_video,
        saved_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      content.id,
      content.type,
      content.title,
      content.subreddit,
      content.author,
      content.url,
      content.permalink,
      content.created_utc,
      content.metadata.score,
      content.metadata.num_comments,
      content.metadata.upvote_ratio,
      content.metadata.selftext,
      content.metadata.body,
      content.url.split('/')[2], // Extract domain from URL
      content.media?.type === 'video',
      savedAt,
      Date.now()
    );
  }

  /**
   * Insert media record
   */
  public insertMedia(media: Partial<MediaRecord>): number {
    const stmt = this.db.prepare(`
      INSERT INTO media (
        content_id, type, url, thumbnail_url, local_path, file_size,
        mime_type, width, height, duration, extension, downloaded_at,
        download_status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      media.content_id,
      media.type,
      media.url,
      media.thumbnail_url,
      media.local_path,
      media.file_size,
      media.mime_type,
      media.width,
      media.height,
      media.duration,
      media.extension,
      media.downloaded_at,
      media.download_status || 'pending',
      media.error_message
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Update media record
   */
  public updateMedia(id: number, updates: Partial<MediaRecord>): void {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'content_id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const stmt = this.db.prepare(`
      UPDATE media SET ${setClause} WHERE id = ?
    `);

    const values = [...fields.map(field => updates[field as keyof MediaRecord]), id];
    stmt.run(...values);
  }

  /**
   * Search content with filters
   */
  public searchContent(
    query: string = '',
    filters: SearchFilters = {},
    limit: number = 50,
    offset: number = 0
  ): SearchResult[] {
    let sql = `
      SELECT 
        c.*,
        GROUP_CONCAT(DISTINCT t.name) as tags,
        COUNT(m.id) as media_count
      FROM content c
      LEFT JOIN content_tags ct ON c.id = ct.content_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      LEFT JOIN media m ON c.id = m.content_id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // Full-text search
    if (query.trim()) {
      conditions.push(`c.id IN (
        SELECT rowid FROM content_fts 
        WHERE content_fts MATCH ?
      )`);
      params.push(query);
    }

    // Filters
    if (filters.subreddit) {
      conditions.push('c.subreddit = ?');
      params.push(filters.subreddit);
    }

    if (filters.author) {
      conditions.push('c.author = ?');
      params.push(filters.author);
    }

    if (filters.mediaType) {
      conditions.push(`EXISTS (
        SELECT 1 FROM media m2 
        WHERE m2.content_id = c.id AND m2.type = ?
      )`);
      params.push(filters.mediaType);
    }

    if (filters.dateFrom) {
      conditions.push('c.created_utc >= ?');
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push('c.created_utc <= ?');
      params.push(filters.dateTo);
    }

    if (filters.minScore) {
      conditions.push('c.score >= ?');
      params.push(filters.minScore);
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagPlaceholders = filters.tags.map(() => '?').join(',');
      conditions.push(`EXISTS (
        SELECT 1 FROM content_tags ct2 
        JOIN tags t2 ON ct2.tag_id = t2.id 
        WHERE ct2.content_id = c.id AND t2.name IN (${tagPlaceholders})
      )`);
      params.push(...filters.tags);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += `
      GROUP BY c.id
      ORDER BY c.saved_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      content: {
        id: row.id,
        type: row.type,
        title: row.title,
        subreddit: row.subreddit,
        author: row.author,
        url: row.url,
        permalink: row.permalink,
        created_utc: row.created_utc,
        score: row.score,
        num_comments: row.num_comments,
        upvote_ratio: row.upvote_ratio,
        selftext: row.selftext,
        body: row.body,
        domain: row.domain,
        is_video: Boolean(row.is_video),
        saved_at: row.saved_at,
        created_at: row.created_at,
        updated_at: row.updated_at
      },
      media: [],
      tags: row.tags ? row.tags.split(',') : [],
      relevance: 1.0 // TODO: Implement relevance scoring
    }));
  }

  /**
   * Get content by ID
   */
  public getContentById(id: string): ContentRecord | null {
    const stmt = this.db.prepare('SELECT * FROM content WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      subreddit: row.subreddit,
      author: row.author,
      url: row.url,
      permalink: row.permalink,
      created_utc: row.created_utc,
      score: row.score,
      num_comments: row.num_comments,
      upvote_ratio: row.upvote_ratio,
      selftext: row.selftext,
      body: row.body,
      domain: row.domain,
      is_video: Boolean(row.is_video),
      saved_at: row.saved_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Get media for content
   */
  public getMediaForContent(contentId: string): MediaRecord[] {
    const stmt = this.db.prepare('SELECT * FROM media WHERE content_id = ?');
    const rows = stmt.all(contentId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      content_id: row.content_id,
      type: row.type,
      url: row.url,
      thumbnail_url: row.thumbnail_url,
      local_path: row.local_path,
      file_size: row.file_size,
      mime_type: row.mime_type,
      width: row.width,
      height: row.height,
      duration: row.duration,
      extension: row.extension,
      downloaded_at: row.downloaded_at,
      download_status: row.download_status,
      error_message: row.error_message,
      created_at: row.created_at
    }));
  }

  /**
   * Add tag to content
   */
  public addTagToContent(contentId: string, tagName: string): void {
    // First, ensure tag exists
    const tagStmt = this.db.prepare(`
      INSERT OR IGNORE INTO tags (name) VALUES (?)
    `);
    tagStmt.run(tagName);

    // Get tag ID
    const getTagStmt = this.db.prepare('SELECT id FROM tags WHERE name = ?');
    const tag = getTagStmt.get(tagName) as any;

    if (tag) {
      // Add content-tag relationship
      const contentTagStmt = this.db.prepare(`
        INSERT OR IGNORE INTO content_tags (content_id, tag_id) VALUES (?, ?)
      `);
      contentTagStmt.run(contentId, tag.id);
    }
  }

  /**
   * Remove tag from content
   */
  public removeTagFromContent(contentId: string, tagName: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM content_tags 
      WHERE content_id = ? AND tag_id = (SELECT id FROM tags WHERE name = ?)
    `);
    stmt.run(contentId, tagName);
  }

  /**
   * Get all tags
   */
  public getAllTags(): Array<{ id: number; name: string; color: string }> {
    const stmt = this.db.prepare('SELECT id, name, color FROM tags ORDER BY name');
    return stmt.all() as Array<{ id: number; name: string; color: string }>;
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    totalContent: number;
    totalImages: number;
    totalVideos: number;
    totalNotes: number;
    totalSize: number;
    downloadsCompleted: number;
    downloadsFailed: number;
  } {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT c.id) as total_content,
        COUNT(CASE WHEN m.type = 'image' THEN 1 END) as total_images,
        COUNT(CASE WHEN m.type = 'video' THEN 1 END) as total_videos,
        COUNT(CASE WHEN m.type = 'text' THEN 1 END) as total_notes,
        COALESCE(SUM(m.file_size), 0) as total_size,
        COUNT(CASE WHEN m.download_status = 'completed' THEN 1 END) as downloads_completed,
        COUNT(CASE WHEN m.download_status = 'failed' THEN 1 END) as downloads_failed
      FROM content c
      LEFT JOIN media m ON c.id = m.content_id
    `).get() as any;

    return {
      totalContent: stats.total_content,
      totalImages: stats.total_images,
      totalVideos: stats.total_videos,
      totalNotes: stats.total_notes,
      totalSize: stats.total_size,
      downloadsCompleted: stats.downloads_completed,
      downloadsFailed: stats.downloads_failed
    };
  }

  /**
   * Save search to history
   */
  public saveSearchHistory(query: string, filters: SearchFilters, resultsCount: number): void {
    const stmt = this.db.prepare(`
      INSERT INTO search_history (query, filters, results_count)
      VALUES (?, ?, ?)
    `);
    stmt.run(query, JSON.stringify(filters), resultsCount);
  }

  /**
   * Get recent search history
   */
  public getSearchHistory(limit: number = 10): Array<{
    query: string;
    filters: SearchFilters;
    results_count: number;
    searched_at: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT query, filters, results_count, searched_at
      FROM search_history
      ORDER BY searched_at DESC
      LIMIT ?
    `);
    
    const rows = stmt.all(limit) as any[];
    return rows.map(row => ({
      query: row.query,
      filters: JSON.parse(row.filters || '{}'),
      results_count: row.results_count,
      searched_at: row.searched_at
    }));
  }

  /**
   * Close database connection
   */
  public close(): void {
    this.db.close();
  }

  /**
   * Backup database
   */
  public backup(backupPath: string): void {
    this.db.backup(backupPath);
  }

  /**
   * Get database size
   */
  public getDatabaseSize(): number {
    const stmt = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()");
    const result = stmt.get() as any;
    return result.size;
  }
} 