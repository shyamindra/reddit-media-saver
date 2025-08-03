import { FilenameSimilarity, SimilarityResult } from './filenameSimilarity';

describe('FilenameSimilarity', () => {
  describe('calculateSimilarity', () => {
    it('should calculate perfect similarity for identical filenames', () => {
      const result = FilenameSimilarity.calculateSimilarity(
        'Amazing_Post_funny_user.jpg',
        'Amazing_Post_funny_user.jpg'
      );

      expect(result.similarity).toBe(1);
      expect(result.commonParts).toEqual(['amazing', 'post', 'funny', 'user']);
      expect(result.differences).toEqual([]);
    });

    it('should calculate similarity for similar filenames', () => {
      const result = FilenameSimilarity.calculateSimilarity(
        'Amazing_Post_funny_user.jpg',
        'Amazing_Post_funny_different.jpg'
      );

      expect(result.similarity).toBe(0.75); // 3 out of 4 parts match
      expect(result.commonParts).toEqual(['amazing', 'post', 'funny']);
      expect(result.differences).toEqual(['user', 'different']);
    });

    it('should handle different length filenames', () => {
      const result = FilenameSimilarity.calculateSimilarity(
        'Amazing_Post_funny_user.jpg',
        'Amazing_Post_funny.jpg'
      );

      expect(result.similarity).toBe(0.75); // 3 out of 4 parts match
      expect(result.commonParts).toEqual(['amazing', 'post', 'funny']);
      expect(result.differences).toEqual(['user']);
    });

    it('should handle empty filenames', () => {
      const result = FilenameSimilarity.calculateSimilarity('', '');
      expect(result.similarity).toBe(0);
      expect(result.commonParts).toEqual([]);
      expect(result.differences).toEqual([]);
    });

    it('should normalize filenames before comparison', () => {
      const result = FilenameSimilarity.calculateSimilarity(
        'Amazing Post (funny) user.jpg',
        'amazing_post_funny_user.jpg'
      );

      expect(result.similarity).toBe(1);
      expect(result.commonParts).toEqual(['amazing', 'post', 'funny', 'user']);
    });
  });

  describe('groupBySimilarity', () => {
    it('should group similar filenames', () => {
      const filenames = [
        'Amazing_Post_funny_user.jpg',
        'Amazing_Post_funny_different.jpg',
        'Amazing_Post_funny_another.jpg',
        'Completely_Different_post.jpg',
        'Another_Different_post.jpg'
      ];

      const groups = FilenameSimilarity.groupBySimilarity(filenames, 0.7);

      expect(groups.length).toBe(1);
      expect(groups[0]).toContain('Amazing_Post_funny_user.jpg');
      expect(groups[0]).toContain('Amazing_Post_funny_different.jpg');
      expect(groups[0]).toContain('Amazing_Post_funny_another.jpg');
    });

    it('should return empty array for no similar files', () => {
      const filenames = [
        'File1.jpg',
        'File2.jpg',
        'File3.jpg'
      ];

      const groups = FilenameSimilarity.groupBySimilarity(filenames, 0.9);
      expect(groups.length).toBe(0);
    });

    it('should handle single file', () => {
      const filenames = ['Single_File.jpg'];
      const groups = FilenameSimilarity.groupBySimilarity(filenames);
      expect(groups.length).toBe(0);
    });

    it('should handle empty array', () => {
      const groups = FilenameSimilarity.groupBySimilarity([]);
      expect(groups.length).toBe(0);
    });
  });

  describe('extractCommonPrefix', () => {
    it('should extract common prefix from similar filenames', () => {
      const filenames = [
        'Amazing_Post_funny_user.jpg',
        'Amazing_Post_funny_different.jpg',
        'Amazing_Post_funny_another.jpg'
      ];

      const prefix = FilenameSimilarity.extractCommonPrefix(filenames);
      expect(prefix).toBe('amazing_post_funny');
    });

    it('should handle no common prefix', () => {
      const filenames = [
        'File1.jpg',
        'File2.jpg',
        'File3.jpg'
      ];

      const prefix = FilenameSimilarity.extractCommonPrefix(filenames);
      expect(prefix).toBe('');
    });

    it('should handle empty array', () => {
      const prefix = FilenameSimilarity.extractCommonPrefix([]);
      expect(prefix).toBe('');
    });
  });

  describe('extractSubreddit', () => {
    it('should extract subreddit from filename', () => {
      const testCases = [
        { filename: 'Post_funny_user.jpg', expected: 'funny' },
        { filename: 'Amazing_Post_funny_user.jpg', expected: 'post' },
        { filename: 'Post_subreddit_user.jpg', expected: 'subreddit' }
      ];

      testCases.forEach(({ filename, expected }) => {
        expect(FilenameSimilarity.extractSubreddit(filename)).toBe(expected);
      });
    });

    it('should return empty string for filenames without subreddit', () => {
      const testCases = [
        'Post.jpg',
        'Post.jpg',
        'Post.jpg'
      ];

      testCases.forEach(filename => {
        expect(FilenameSimilarity.extractSubreddit(filename)).toBe('');
      });
    });
  });

  describe('extractAuthor', () => {
    it('should extract author from filename', () => {
      const testCases = [
        { filename: 'Post_funny_user.jpg', expected: 'user' },
        { filename: 'Amazing_Post_funny_user.jpg', expected: 'funny' },
        { filename: 'Post_subreddit_author.jpg', expected: 'author' }
      ];

      testCases.forEach(({ filename, expected }) => {
        expect(FilenameSimilarity.extractAuthor(filename)).toBe(expected);
      });
    });

    it('should return empty string for filenames without author', () => {
      const testCases = [
        'Post.jpg',
        'Post_subreddit.jpg'
      ];

      testCases.forEach(filename => {
        expect(FilenameSimilarity.extractAuthor(filename)).toBe('');
      });
    });
  });

  describe('extractTitle', () => {
    it('should extract title from filename', () => {
      const testCases = [
        { filename: 'Post_funny_user.jpg', expected: 'post' },
        { filename: 'Amazing_Post_funny_user.jpg', expected: 'amazing' },
        { filename: 'Title_subreddit_author.jpg', expected: 'title' }
      ];

      testCases.forEach(({ filename, expected }) => {
        expect(FilenameSimilarity.extractTitle(filename)).toBe(expected);
      });
    });

    it('should return empty string for empty filename', () => {
      expect(FilenameSimilarity.extractTitle('')).toBe('');
    });
  });

  describe('normalizeFilename', () => {
    it('should normalize filename correctly', () => {
      const testCases = [
        { input: 'Amazing Post (funny) user.jpg', expected: 'amazing_post_funny_user' },
        { input: 'File with spaces.jpg', expected: 'file_with_spaces' },
        { input: 'File_with_underscores.jpg', expected: 'file_with_underscores' },
        { input: 'File___with___multiple___underscores.jpg', expected: 'file_with_multiple_underscores' },
        { input: '_File_with_leading_underscore.jpg', expected: 'file_with_leading_underscore' },
        { input: 'File_with_trailing_underscore_.jpg', expected: 'file_with_trailing_underscore' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(FilenameSimilarity.normalizeFilename(input)).toBe(expected);
      });
    });
  });

  describe('isSameSubreddit', () => {
    it('should return true for same subreddit', () => {
      const result = FilenameSimilarity.isSameSubreddit(
        'Post_funny_user1.jpg',
        'Post_funny_user2.jpg'
      );
      expect(result).toBe(true);
    });

    it('should return false for different subreddits', () => {
      const result = FilenameSimilarity.isSameSubreddit(
        'Post_funny_user.jpg',
        'Post_different_user.jpg'
      );
      expect(result).toBe(false);
    });

    it('should return false when subreddit is missing', () => {
      const result = FilenameSimilarity.isSameSubreddit(
        'Post_user.jpg',
        'Post_funny_user.jpg'
      );
      expect(result).toBe(false);
    });
  });

  describe('isSameAuthor', () => {
    it('should return true for same author', () => {
      const result = FilenameSimilarity.isSameAuthor(
        'Post_funny_user.jpg',
        'Post_different_user.jpg'
      );
      expect(result).toBe(true);
    });

    it('should return false for different authors', () => {
      const result = FilenameSimilarity.isSameAuthor(
        'Post_funny_user1.jpg',
        'Post_funny_user2.jpg'
      );
      expect(result).toBe(false);
    });

    it('should return false when author is missing', () => {
      const result = FilenameSimilarity.isSameAuthor(
        'Post_funny.jpg',
        'Post_funny_user.jpg'
      );
      expect(result).toBe(false);
    });
  });

  describe('generateGroupName', () => {
    it('should use common subreddit when available', () => {
      const filenames = [
        'Post_funny_user1.jpg',
        'Post_funny_user2.jpg',
        'Post_funny_user3.jpg'
      ];

      const groupName = FilenameSimilarity.generateGroupName(filenames);
      expect(groupName).toBe('funny');
    });

    it('should use common author when subreddit differs', () => {
      const filenames = [
        'Post_funny_user.jpg',
        'Post_different_user.jpg'
      ];

      const groupName = FilenameSimilarity.generateGroupName(filenames);
      expect(groupName).toBe('user');
    });

    it('should use common prefix when subreddit and author differ', () => {
      const filenames = [
        'Amazing_Post_funny_user1.jpg',
        'Amazing_Post_different_user2.jpg'
      ];

      const groupName = FilenameSimilarity.generateGroupName(filenames);
      expect(groupName).toBe('post');
    });

    it('should use first filename title as fallback', () => {
      const filenames = [
        'Post1_funny_user1.jpg',
        'Post2_different_user2.jpg'
      ];

      const groupName = FilenameSimilarity.generateGroupName(filenames);
      expect(groupName).toBe('post1');
    });

    it('should handle empty array', () => {
      const groupName = FilenameSimilarity.generateGroupName([]);
      expect(groupName).toBe('');
    });
  });

  describe('jaccardSimilarity', () => {
    it('should calculate Jaccard similarity correctly', () => {
      const words1 = ['a', 'b', 'c'];
      const words2 = ['b', 'c', 'd'];

      const similarity = FilenameSimilarity.jaccardSimilarity(words1, words2);
      expect(similarity).toBe(0.5); // 2 common / 4 total unique
    });

    it('should return 1 for identical word sets', () => {
      const words = ['a', 'b', 'c'];
      const similarity = FilenameSimilarity.jaccardSimilarity(words, words);
      expect(similarity).toBe(1);
    });

    it('should return 0 for completely different word sets', () => {
      const words1 = ['a', 'b', 'c'];
      const words2 = ['d', 'e', 'f'];

      const similarity = FilenameSimilarity.jaccardSimilarity(words1, words2);
      expect(similarity).toBe(0);
    });

    it('should handle empty arrays', () => {
      const similarity = FilenameSimilarity.jaccardSimilarity([], []);
      expect(similarity).toBe(0);
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const words1 = ['a', 'b', 'c'];
      const words2 = ['b', 'c', 'd'];

      const similarity = FilenameSimilarity.cosineSimilarity(words1, words2);
      expect(similarity).toBeCloseTo(0.67, 2);
    });

    it('should return 1 for identical word sets', () => {
      const words = ['a', 'b', 'c'];
      const similarity = FilenameSimilarity.cosineSimilarity(words, words);
      expect(similarity).toBeCloseTo(1, 10);
    });

    it('should return 0 for completely different word sets', () => {
      const words1 = ['a', 'b', 'c'];
      const words2 = ['d', 'e', 'f'];

      const similarity = FilenameSimilarity.cosineSimilarity(words1, words2);
      expect(similarity).toBe(0);
    });

    it('should handle empty arrays', () => {
      const similarity = FilenameSimilarity.cosineSimilarity([], []);
      expect(similarity).toBe(0);
    });
  });
}); 