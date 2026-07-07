import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadAppConfig, resetAppConfigForTests } from '../config/appConfig';
import {
  groupFilenamesByNamedGroups,
  groupFilenamesByPatterns,
  runOrganizeByPattern,
  sanitizePatternFolderName,
} from './organizeByPattern';
import { detectLocalMp4Issue, runIntegrityScan } from './integrityScan';

describe('sanitizePatternFolderName', () => {
  it('lowercases and replaces non-alphanumeric characters', () => {
    expect(sanitizePatternFolderName('WatchItForThePlot')).toBe('watchitfortheplot');
    expect(sanitizePatternFolderName('Ni_Bondha')).toBe('ni_bondha');
  });
});

describe('groupFilenamesByPatterns', () => {
  it('groups filenames by first matching pattern', () => {
    const groups = groupFilenamesByPatterns(
      ['scene_WatchItForThePlot_1.mp4', 'scene_WatchItForThePlot_2.mp4', 'misc.mp4'],
      ['WatchItForThePlot'],
    );

    expect(groups.get('WatchItForThePlot')).toEqual([
      'scene_WatchItForThePlot_1.mp4',
      'scene_WatchItForThePlot_2.mp4',
    ]);
    expect(groups.has('misc')).toBe(false);
  });
});

describe('groupFilenamesByNamedGroups', () => {
  it('assigns each file to at most one named group', () => {
    const groups = groupFilenamesByNamedGroups(
      ['star_a_clip.mp4', 'star_a_scene.mp4', 'other.mp4'],
      [{ folderName: 'star-a', patterns: ['star_a'] }],
    );

    expect(groups.get('star-a')?.files).toEqual(['star_a_clip.mp4', 'star_a_scene.mp4']);
  });
});

describe('runOrganizeByPattern', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetAppConfigForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetAppConfigForTests();
  });

  it('moves files sharing a pattern into a subfolder', () => {
    const root = mkdtempSync(join(tmpdir(), 'repair-pattern-'));
    process.env.REDDIT_SAVER_DOWNLOADS_DIR = root;
    const config = loadAppConfig();
    const videosDir = config.paths.output.videos;
    mkdirSync(videosDir, { recursive: true });

    writeFileSync(join(videosDir, 'clip_WatchItForThePlot_1.mp4'), Buffer.from('a'));
    writeFileSync(join(videosDir, 'clip_WatchItForThePlot_2.mp4'), Buffer.from('b'));

    const summary = runOrganizeByPattern({
      patterns: ['WatchItForThePlot'],
      categories: ['Videos'],
      dryRun: false,
    });

    expect(summary.groupsCreated).toBe(1);
    expect(summary.organizedFiles).toBe(2);
    expect(existsSync(join(videosDir, 'watchitfortheplot', 'clip_WatchItForThePlot_1.mp4'))).toBe(
      true,
    );
  });

  it('supports dry-run without moving files', () => {
    const root = mkdtempSync(join(tmpdir(), 'repair-pattern-dry-'));
    process.env.REDDIT_SAVER_DOWNLOADS_DIR = root;
    const config = loadAppConfig();
    const videosDir = config.paths.output.videos;
    mkdirSync(videosDir, { recursive: true });

    writeFileSync(join(videosDir, 'clip_WatchItForThePlot_1.mp4'), Buffer.from('a'));
    writeFileSync(join(videosDir, 'clip_WatchItForThePlot_2.mp4'), Buffer.from('b'));

    const summary = runOrganizeByPattern({
      patterns: ['WatchItForThePlot'],
      categories: ['Videos'],
      dryRun: true,
    });

    expect(summary.groupsCreated).toBe(1);
    expect(existsSync(join(videosDir, 'watchitfortheplot'))).toBe(false);
  });
});

describe('detectLocalMp4Issue', () => {
  it('flags HTML content saved as mp4', () => {
    const root = mkdtempSync(join(tmpdir(), 'repair-integrity-'));
    const filePath = join(root, 'fake.mp4');
    writeFileSync(filePath, '<!DOCTYPE html><html><body>nope</body></html>', 'utf8');

    expect(detectLocalMp4Issue(filePath)?.issue).toBe('html_content');
  });

  it('flags empty files', () => {
    const root = mkdtempSync(join(tmpdir(), 'repair-integrity-empty-'));
    const filePath = join(root, 'empty.mp4');
    writeFileSync(filePath, '');

    expect(detectLocalMp4Issue(filePath)?.issue).toBe('empty');
  });
});

describe('runIntegrityScan', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetAppConfigForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetAppConfigForTests();
  });

  it('reports HTML masquerading as video files', async () => {
    const root = mkdtempSync(join(tmpdir(), 'repair-scan-'));
    process.env.REDDIT_SAVER_DOWNLOADS_DIR = root;
    const config = loadAppConfig();
    mkdirSync(config.paths.output.videos, { recursive: true });
    writeFileSync(
      join(config.paths.output.videos, 'broken.mp4'),
      '<!DOCTYPE html><html><body>error</body></html>' + 'x'.repeat(1100),
      'utf8',
    );

    const summary = await runIntegrityScan();

    expect(summary.scanned).toBe(1);
    expect(summary.issues).toHaveLength(1);
    expect(summary.issues[0]?.issue).toBe('html_content');
  });

  it('uses optional probe callback for stream validation', async () => {
    const root = mkdtempSync(join(tmpdir(), 'repair-scan-probe-'));
    process.env.REDDIT_SAVER_DOWNLOADS_DIR = root;
    const config = loadAppConfig();
    mkdirSync(config.paths.output.videos, { recursive: true });
    writeFileSync(join(config.paths.output.videos, 'valid-looking.mp4'), Buffer.from([0, 0, 0]));

    const summary = await runIntegrityScan({
      probeVideo: async () => ({ hasVideoStream: false, detail: 'no stream' }),
    });

    expect(summary.issues).toEqual([
      expect.objectContaining({
        fileName: 'valid-looking.mp4',
        issue: 'no_video_stream',
      }),
    ]);
  });
});
