import { readFileSync, readdirSync } from 'fs';
import { isAbsolute, join } from 'path';
import { loadAppConfig } from '../config/appConfig';
import { titleFromPostUrl } from '../linkIntake/redditUrlParsers';

function resolvePath(filePath: string): string {
  return isAbsolute(filePath) ? filePath : join(process.cwd(), filePath);
}

export interface RedditUrlInfo {
  url: string;
  type: 'post' | 'comment' | 'media' | 'invalid';
  subreddit?: string;
  postId?: string;
  commentId?: string;
}

export interface RedditPostRow {
  url: string;
  title: string;
  subreddit: string;
  author: string;
}

export class FileInputService {
  private static readonly REDDIT_URL_PATTERNS = {
    post: /^https?:\/\/(?:www\.)?reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)(?:\/([^\/]+))?\/?$/,
    comment: /^https?:\/\/(?:www\.)?reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)(?:\/([^\/]+))?\/comment\/([^\/]+)\/?$/,
    media: /^https?:\/\/(?:www\.)?reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)(?:\/([^\/]+))?\/?$/
  };

  /**
   * Read Reddit URLs from a CSV file (key, URL format)
   */
  static readRedditUrlsFromCsv(filePath: string): string[] {
    try {
      const fullPath = resolvePath(filePath);
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const urls: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
          continue; // Skip empty lines and comments
        }

        // Parse CSV line - split by comma and take the second column as URL
        const columns = trimmedLine.split(',').map(col => col.trim());
        if (columns.length >= 2) {
          const url = columns[1]; // Second column should be the URL

          if (url && url.length > 0 && url !== 'permalink' && url.startsWith('http')) {
            urls.push(url);
          }
        }
      }

      return urls;
    } catch (error) {
      console.error(`Error reading CSV file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Find all CSV files in the input directory
   */
  static findCsvFiles(inputDir: string = loadAppConfig().paths.redditLinksDir): string[] {
    try {
      const fullPath = resolvePath(inputDir);
      const files = readdirSync(fullPath);
      return files
        .filter(file => file.toLowerCase().endsWith('.csv'))
        .map(file => join(inputDir, file));
    } catch (error) {
      console.error(`Error reading directory ${inputDir}:`, error);
      return [];
    }
  }

  /**
   * Read Reddit URLs from all CSV files in the input directory
   */
  static readAllRedditUrls(inputDir: string = loadAppConfig().paths.redditLinksDir): string[] {
    const csvFiles = FileInputService.findCsvFiles(inputDir);
    const allUrls: string[] = [];

    console.log(`📁 Found ${csvFiles.length} CSV files in ${inputDir}/`);

    for (const csvFile of csvFiles) {
      console.log(`📄 Processing: ${csvFile}`);
      const urls = FileInputService.readRedditUrlsFromCsv(csvFile);
      allUrls.push(...urls);
      console.log(`   Found ${urls.length} URLs`);
    }

    return allUrls;
  }

  /**
   * Read Reddit URLs from a text file (legacy support)
   */
  static readRedditUrls(filePath: string = 'reddit-links.txt'): string[] {
    try {
      const fullPath = resolvePath(filePath);
      const content = readFileSync(fullPath, 'utf-8');
      return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#')); // Skip empty lines and comments
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Validate and parse a Reddit URL
   */
  static validateRedditUrl(url: string): RedditUrlInfo {
    const trimmedUrl = url.trim();

    // Check for explicit /comment/ID pattern
    const commentMatch = trimmedUrl.match(FileInputService.REDDIT_URL_PATTERNS.comment);
    if (commentMatch) {
      return {
        url: trimmedUrl,
        type: 'comment',
        subreddit: commentMatch[1],
        postId: commentMatch[2],
        commentId: commentMatch[4]
      };
    }

    // Reddit shorthand comment URLs: /comments/POSTID/slug/COMMENTID/
    const shorthandCommentMatch = trimmedUrl.match(
      /^https?:\/\/(?:www\.)?reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)\/(.+)\/?$/
    );
    if (shorthandCommentMatch) {
      const trailingSegments = shorthandCommentMatch[3].split('/').filter(Boolean);
      if (trailingSegments.length >= 2) {
        const commentId = trailingSegments[trailingSegments.length - 1];
        return {
          url: trimmedUrl,
          type: 'comment',
          subreddit: shorthandCommentMatch[1],
          postId: shorthandCommentMatch[2],
          commentId
        };
      }
    }
    
    // Check for post pattern
    const postMatch = trimmedUrl.match(FileInputService.REDDIT_URL_PATTERNS.post);
    if (postMatch) {
      return {
        url: trimmedUrl,
        type: 'post',
        subreddit: postMatch[1],
        postId: postMatch[2]
      };
    }

    // Check for media pattern (same as post for now)
    const mediaMatch = trimmedUrl.match(FileInputService.REDDIT_URL_PATTERNS.media);
    if (mediaMatch) {
      return {
        url: trimmedUrl,
        type: 'media',
        subreddit: mediaMatch[1],
        postId: mediaMatch[2]
      };
    }

    return {
      url: trimmedUrl,
      type: 'invalid'
    };
  }

  /**
   * Read post rows from CSV via link intake (replaces inline readCsvFiles in extract scripts).
   */
  static readRedditPostsFromCsv(inputDir: string = loadAppConfig().paths.redditLinksDir): RedditPostRow[] {
    const { valid } = FileInputService.processRedditUrlsFromCsv(inputDir);
    return valid
      .filter((item) => item.type === 'post' || item.type === 'media')
      .map((item) => ({
        url: item.url,
        title: titleFromPostUrl(item.url),
        subreddit: item.subreddit ?? 'unknown',
        author: 'Unknown',
      }));
  }

  /**
   * Process all URLs from CSV files and return validated results
   */
  static processRedditUrlsFromCsv(inputDir: string = loadAppConfig().paths.redditLinksDir): {
    valid: RedditUrlInfo[];
    invalid: string[];
  } {
    const urls = inputDir.toLowerCase().endsWith('.csv')
      ? FileInputService.readRedditUrlsFromCsv(inputDir)
      : FileInputService.readAllRedditUrls(inputDir);
    const valid: RedditUrlInfo[] = [];
    const invalid: string[] = [];

    urls.forEach(url => {
      const result = FileInputService.validateRedditUrl(url);
      if (result.type === 'invalid') {
        invalid.push(url);
      } else {
        valid.push(result);
      }
    });

    return { valid, invalid };
  }

  /**
   * Process all URLs from file and return validated results (legacy support)
   */
  static processRedditUrls(filePath: string = 'reddit-links.txt'): {
    valid: RedditUrlInfo[];
    invalid: string[];
  } {
    const urls = FileInputService.readRedditUrls(filePath);
    const valid: RedditUrlInfo[] = [];
    const invalid: string[] = [];

    urls.forEach(url => {
      const result = FileInputService.validateRedditUrl(url);
      if (result.type === 'invalid') {
        invalid.push(url);
      } else {
        valid.push(result);
      }
    });

    return { valid, invalid };
  }
} 