import { FileUtils } from './fileUtils';
import { promises as fs } from 'fs';
import path from 'path';
import type { ContentMetadata } from '../types';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    stat: jest.fn()
  }
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('FileUtils', () => {
  let fileUtils: FileUtils;
  const testBasePath = '/test/path';

  beforeEach(() => {
    fileUtils = new FileUtils(testBasePath);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct paths', () => {
      const config = fileUtils.getConfig();
      expect(config.basePath).toBe(testBasePath);
      expect(config.imagesPath).toBe(path.join(testBasePath, 'Images'));
      expect(config.videosPath).toBe(path.join(testBasePath, 'Videos'));
      expect(config.notesPath).toBe(path.join(testBasePath, 'Notes'));
      expect(config.metadataPath).toBe(path.join(testBasePath, 'metadata'));
    });
  });

  describe('initializeFolderStructure', () => {
    it('should create all required directories', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockResolvedValue(undefined);

      await fileUtils.initializeFolderStructure();

      expect(mockFs.mkdir).toHaveBeenCalledTimes(5);
      expect(mockFs.mkdir).toHaveBeenCalledWith(testBasePath, { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join(testBasePath, 'Images'), { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join(testBasePath, 'Videos'), { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join(testBasePath, 'Notes'), { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join(testBasePath, 'metadata'), { recursive: true });
    });

    it('should not create directories that already exist', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);

      await fileUtils.initializeFolderStructure();

      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', async () => {
      const dirPath = '/test/directory';
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockResolvedValue(undefined);

      await fileUtils.ensureDirectoryExists(dirPath);

      expect(mockFs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      const dirPath = '/test/directory';
      mockFs.access.mockResolvedValue(undefined);

      await fileUtils.ensureDirectoryExists(dirPath);

      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('getMediaFolderPath', () => {
    it('should return correct path for images', () => {
      const result = fileUtils.getMediaFolderPath('image');
      expect(result).toBe(path.join(testBasePath, 'Images'));
    });

    it('should return correct path for videos', () => {
      const result = fileUtils.getMediaFolderPath('video');
      expect(result).toBe(path.join(testBasePath, 'Videos'));
    });

    it('should return correct path for notes', () => {
      const result = fileUtils.getMediaFolderPath('note');
      expect(result).toBe(path.join(testBasePath, 'Notes'));
    });

    it('should throw error for unsupported media type', () => {
      expect(() => fileUtils.getMediaFolderPath('unsupported' as any)).toThrow('Unsupported media type: unsupported');
    });
  });

  describe('sanitizeFilename', () => {
    it('should replace invalid characters with underscores', () => {
      const result = fileUtils.sanitizeFilename('file<name>with"invalid"chars');
      expect(result).toBe('file_name_with_invalid_chars');
    });

    it('should replace spaces with underscores', () => {
      const result = fileUtils.sanitizeFilename('file name with spaces');
      expect(result).toBe('file_name_with_spaces');
    });

    it('should replace multiple underscores with single', () => {
      const result = fileUtils.sanitizeFilename('file___name___with___underscores');
      expect(result).toBe('file_name_with_underscores');
    });

    it('should limit filename length to 200 characters', () => {
      const longName = 'a'.repeat(300);
      const result = fileUtils.sanitizeFilename(longName);
      expect(result.length).toBe(200);
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate unique filename when file does not exist', async () => {
      const baseFilename = 'test';
      const extension = '.jpg';
      const folderPath = '/test/folder';
      
      mockFs.access.mockRejectedValue(new Error('File does not exist'));

      const result = await fileUtils.generateUniqueFilename(baseFilename, extension, folderPath);

      expect(result).toBe('test.jpg');
    });

    it('should append counter when file exists', async () => {
      const baseFilename = 'test';
      const extension = '.jpg';
      const folderPath = '/test/folder';
      
      // First call: file exists, second call: file does not exist
      mockFs.access
        .mockResolvedValueOnce(undefined) // File exists
        .mockRejectedValueOnce(new Error('File does not exist')); // File does not exist

      const result = await fileUtils.generateUniqueFilename(baseFilename, extension, folderPath);

      expect(result).toBe('test_1.jpg');
    });

    it('should increment counter until unique filename is found', async () => {
      const baseFilename = 'test';
      const extension = '.jpg';
      const folderPath = '/test/folder';
      
      // First two files exist, third does not
      mockFs.access
        .mockResolvedValueOnce(undefined) // test.jpg exists
        .mockResolvedValueOnce(undefined) // test_1.jpg exists
        .mockRejectedValueOnce(new Error('File does not exist')); // test_2.jpg does not exist

      const result = await fileUtils.generateUniqueFilename(baseFilename, extension, folderPath);

      expect(result).toBe('test_2.jpg');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await fileUtils.fileExists('/test/file.txt');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File does not exist'));

      const result = await fileUtils.fileExists('/test/file.txt');

      expect(result).toBe(false);
    });
  });

  describe('writeMetadata', () => {
    it('should write metadata to JSON file', async () => {
      const metadata: ContentMetadata = {
        id: 'test123',
        type: 'post',
        mediaType: 'image',
        title: 'Test Post',
        author: 'testuser',
        subreddit: 'testsub',
        url: 'https://example.com',
        permalink: '/r/testsub/comments/test123',
        created_utc: 1234567890,
        score: 100,
        localPath: '/test/path/image.jpg',
        mediaFiles: ['/test/path/image.jpg'],
        folderPath: '/test/path',
        downloadedAt: 1234567890
      };

      mockFs.writeFile.mockResolvedValue(undefined);

      await fileUtils.writeMetadata(metadata);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(testBasePath, 'metadata', 'test123.json'),
        JSON.stringify(metadata, null, 2),
        'utf8'
      );
    });
  });

  describe('readMetadata', () => {
    it('should read and parse metadata from JSON file', async () => {
      const metadata: ContentMetadata = {
        id: 'test123',
        type: 'post',
        mediaType: 'image',
        title: 'Test Post',
        author: 'testuser',
        subreddit: 'testsub',
        url: 'https://example.com',
        permalink: '/r/testsub/comments/test123',
        created_utc: 1234567890,
        score: 100,
        localPath: '/test/path/image.jpg',
        mediaFiles: ['/test/path/image.jpg'],
        folderPath: '/test/path',
        downloadedAt: 1234567890
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(metadata));

      const result = await fileUtils.readMetadata('test123');

      expect(result).toEqual(metadata);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(testBasePath, 'metadata', 'test123.json'),
        'utf8'
      );
    });

    it('should return null when file does not exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File does not exist'));

      const result = await fileUtils.readMetadata('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the configuration', () => {
      const config1 = fileUtils.getConfig();
      const config2 = fileUtils.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });
  });
}); 