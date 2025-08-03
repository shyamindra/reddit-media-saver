import { MediaUtils, MediaInfo } from './mediaUtils';

describe('MediaUtils', () => {
  describe('detectMediaType', () => {
    it('should detect GIF URLs correctly', () => {
      const gifUrls = [
        'https://example.com/image.gif',
        'https://gfycat.com/example',
        'https://imgur.com/example.gif'
      ];

      gifUrls.forEach(url => {
        const result = MediaUtils.detectMediaType(url);
        expect(result.type).toBe('gif');
        expect(result.extension).toBe('.gif');
        expect(result.mimeType).toBe('image/gif');
      });
    });

    it('should detect image URLs correctly', () => {
      const imageUrls = [
        'https://example.com/image.jpg',
        'https://example.com/image.jpeg',
        'https://example.com/image.png',
        'https://example.com/image.webp',
        'https://i.redd.it/example.jpg',
        'https://preview.redd.it/example.png',
        'https://imgur.com/example.jpg'
      ];

      imageUrls.forEach(url => {
        const result = MediaUtils.detectMediaType(url);
        expect(result.type).toBe('image');
        expect(result.url).toBe(url);
      });
    });

    it('should detect video URLs correctly', () => {
      const videoUrls = [
        'https://example.com/video.mp4',
        'https://example.com/video.webm',
        'https://v.redd.it/example',
        'https://youtube.com/watch?v=example',
        'https://youtu.be/example',
        'https://vimeo.com/example'
      ];

      videoUrls.forEach(url => {
        const result = MediaUtils.detectMediaType(url);
        expect(result.type).toBe('video');
        expect(result.url).toBe(url);
      });
    });

    it('should default to link for unknown URLs', () => {
      const unknownUrls = [
        'https://example.com/document.pdf',
        'https://example.com/unknown',
        'https://reddit.com/r/example'
      ];

      unknownUrls.forEach(url => {
        const result = MediaUtils.detectMediaType(url);
        expect(result.type).toBe('link');
        expect(result.url).toBe(url);
      });
    });
  });

  describe('isImageUrl', () => {
    it('should return true for image URLs', () => {
      const imageUrls = [
        'https://example.com/image.jpg',
        'https://example.com/image.png',
        'https://i.redd.it/example.jpg',
        'https://imgur.com/example.png'
      ];

      imageUrls.forEach(url => {
        expect(MediaUtils.isImageUrl(url)).toBe(true);
      });
    });

    it('should return false for non-image URLs', () => {
      const nonImageUrls = [
        'https://example.com/video.mp4',
        'https://example.com/document.pdf',
        'https://reddit.com/r/example'
      ];

      nonImageUrls.forEach(url => {
        expect(MediaUtils.isImageUrl(url)).toBe(false);
      });
    });
  });

  describe('isVideoUrl', () => {
    it('should return true for video URLs', () => {
      const videoUrls = [
        'https://example.com/video.mp4',
        'https://v.redd.it/example',
        'https://youtube.com/watch?v=example',
        'https://vimeo.com/example'
      ];

      videoUrls.forEach(url => {
        expect(MediaUtils.isVideoUrl(url)).toBe(true);
      });
    });

    it('should return false for non-video URLs', () => {
      const nonVideoUrls = [
        'https://example.com/image.jpg',
        'https://example.com/document.pdf',
        'https://reddit.com/r/example'
      ];

      nonVideoUrls.forEach(url => {
        expect(MediaUtils.isVideoUrl(url)).toBe(false);
      });
    });
  });

  describe('isGifUrl', () => {
    it('should return true for GIF URLs', () => {
      const gifUrls = [
        'https://example.com/image.gif',
        'https://gfycat.com/example',
        'https://imgur.com/example.gif'
      ];

      gifUrls.forEach(url => {
        expect(MediaUtils.isGifUrl(url)).toBe(true);
      });
    });

    it('should return false for non-GIF URLs', () => {
      const nonGifUrls = [
        'https://example.com/image.jpg',
        'https://example.com/video.mp4',
        'https://reddit.com/r/example'
      ];

      nonGifUrls.forEach(url => {
        expect(MediaUtils.isGifUrl(url)).toBe(false);
      });
    });
  });

  describe('getImageExtension', () => {
    it('should return correct extension for image URLs', () => {
      const testCases = [
        { url: 'https://example.com/image.jpg', expected: '.jpg' },
        { url: 'https://example.com/image.jpeg', expected: '.jpeg' },
        { url: 'https://example.com/image.png', expected: '.png' },
        { url: 'https://example.com/image.webp', expected: '.webp' },
        { url: 'https://example.com/image.gif', expected: '.gif' },
        { url: 'https://i.redd.it/example', expected: '.jpg' },
        { url: 'https://imgur.com/example', expected: '.jpg' }
      ];

      testCases.forEach(({ url, expected }) => {
        expect(MediaUtils.getImageExtension(url)).toBe(expected);
      });
    });
  });

  describe('getVideoExtension', () => {
    it('should return correct extension for video URLs', () => {
      const testCases = [
        { url: 'https://example.com/video.mp4', expected: '.mp4' },
        { url: 'https://example.com/video.webm', expected: '.webm' },
        { url: 'https://example.com/video.avi', expected: '.avi' },
        { url: 'https://v.redd.it/example', expected: '.mp4' }
      ];

      testCases.forEach(({ url, expected }) => {
        expect(MediaUtils.getVideoExtension(url)).toBe(expected);
      });
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types', () => {
      const testCases = [
        { extension: '.jpg', expected: 'image/jpeg' },
        { extension: '.jpeg', expected: 'image/jpeg' },
        { extension: '.png', expected: 'image/png' },
        { extension: '.gif', expected: 'image/gif' },
        { extension: '.webp', expected: 'image/webp' },
        { extension: '.mp4', expected: 'video/mp4' },
        { extension: '.webm', expected: 'video/webm' },
        { extension: '.avi', expected: 'video/x-msvideo' },
        { extension: '.unknown', expected: 'application/octet-stream' }
      ];

      testCases.forEach(({ extension, expected }) => {
        expect(MediaUtils.getMimeType(extension)).toBe(expected);
      });
    });

    it('should handle case-insensitive extensions', () => {
      expect(MediaUtils.getMimeType('.JPG')).toBe('image/jpeg');
      expect(MediaUtils.getMimeType('.PNG')).toBe('image/png');
      expect(MediaUtils.getMimeType('.MP4')).toBe('video/mp4');
    });
  });

  describe('generateFilename', () => {
    it('should generate descriptive filename using title as primary name', () => {
      const result = MediaUtils.generateFilename(
        'Amazing Reddit Post',
        'funny',
        'reddituser',
        'image',
        '.jpg'
      );

      expect(result).toBe('Amazing_Reddit_Post_funny.jpg');
    });

    it('should sanitize special characters', () => {
      const result = MediaUtils.generateFilename(
        'Post with <special> "characters"',
        'test-sub',
        'user.name',
        'video',
        '.mp4'
      );

      expect(result).toBe('Post_with_special_characters_test-sub.mp4');
    });

    it('should limit title length but allow longer titles', () => {
      const longTitle = 'A'.repeat(100);
      const result = MediaUtils.generateFilename(
        longTitle,
        'subreddit',
        'user',
        'image',
        '.jpg'
      );

      expect(result.length).toBeLessThan(150);
      expect(result).toMatch(/^A{100}_subreddit\.jpg$/);
    });

    it('should handle empty or short titles', () => {
      const result = MediaUtils.generateFilename(
        'Short',
        'subreddit',
        'user',
        'note',
        '.txt'
      );

      expect(result).toBe('Short_subreddit.txt');
    });

    it('should limit subreddit name length', () => {
      const result = MediaUtils.generateFilename(
        'Test Title',
        'verylongsubredditname',
        'user',
        'image',
        '.jpg'
      );

      expect(result).toBe('Test_Title_verylongsubredditnam.jpg');
    });
  });

  describe('isDownloadable', () => {
    it('should return true for downloadable media types', () => {
      const downloadableTypes = ['image', 'video', 'gif'];

      downloadableTypes.forEach(type => {
        expect(MediaUtils.isDownloadable(type)).toBe(true);
      });
    });

    it('should return false for non-downloadable media types', () => {
      const nonDownloadableTypes = ['text', 'link', 'unknown'];

      nonDownloadableTypes.forEach(type => {
        expect(MediaUtils.isDownloadable(type)).toBe(false);
      });
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      const testCases = [
        { bytes: 0, expected: '0 Bytes' },
        { bytes: 1024, expected: '1 KB' },
        { bytes: 1024 * 1024, expected: '1 MB' },
        { bytes: 1024 * 1024 * 1024, expected: '1 GB' },
        { bytes: 1500, expected: '1.46 KB' },
        { bytes: 1024 * 1024 * 1.5, expected: '1.5 MB' }
      ];

      testCases.forEach(({ bytes, expected }) => {
        expect(MediaUtils.formatFileSize(bytes)).toBe(expected);
      });
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com/path',
        'https://subdomain.example.com/path?param=value#fragment',
        'ftp://example.com'
      ];

      validUrls.forEach(url => {
        expect(MediaUtils.isValidUrl(url)).toBe(true);
      });
    });

    it('should return false for invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'http://',
        'https://',
        'ftp://',
        '',
        'example.com',
        'www.example.com'
      ];

      invalidUrls.forEach(url => {
        expect(MediaUtils.isValidUrl(url)).toBe(false);
      });
    });
  });

  describe('getDomain', () => {
    it('should extract domain from URLs', () => {
      const testCases = [
        { url: 'https://example.com', expected: 'example.com' },
        { url: 'https://subdomain.example.com', expected: 'subdomain.example.com' },
        { url: 'http://www.example.com/path', expected: 'www.example.com' },
        { url: 'https://example.com/path?param=value#fragment', expected: 'example.com' }
      ];

      testCases.forEach(({ url, expected }) => {
        expect(MediaUtils.getDomain(url)).toBe(expected);
      });
    });

    it('should return empty string for invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'http://',
        'https://',
        ''
      ];

      invalidUrls.forEach(url => {
        expect(MediaUtils.getDomain(url)).toBe('');
      });
    });
  });
}); 