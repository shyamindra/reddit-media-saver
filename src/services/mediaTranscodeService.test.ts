import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { FfmpegAdapter } from '../adapters/ffmpegAdapter';
import { FfmpegNotFoundError } from '../adapters/ffmpegAdapter';
import {
  buildOutputPath,
  ensureFfmpegAvailable,
  findTranscodeCandidates,
  isTranscodeSourceFile,
  transcodeDirectory,
  transcodeFile,
  validateTranscodeInput,
} from './mediaTranscodeService';

const GIF_HEADER = 'GIF89a';

class MockFfmpegAdapter implements FfmpegAdapter {
  available = true;
  transcodeCalls: Array<{ inputPath: string; outputPath: string }> = [];
  shouldFailFor: string[] = [];

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async transcode(inputPath: string, outputPath: string): Promise<void> {
    this.transcodeCalls.push({ inputPath, outputPath });

    if (this.shouldFailFor.includes(inputPath)) {
      throw new Error(`mock transcode failed for ${inputPath}`);
    }

    writeFileSync(outputPath, 'mock mp4 content');
  }
}

function createFixtureRoot(): string {
  const root = join(
    tmpdir(),
    `media-transcode-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(root, 'Gifs', 'nested'), { recursive: true });
  mkdirSync(join(root, 'Media'), { recursive: true });
  mkdirSync(join(root, 'Videos'), { recursive: true });
  return root;
}

describe('mediaTranscodeService', () => {
  describe('isTranscodeSourceFile', () => {
    it('matches gif and gifv extensions case-insensitively', () => {
      expect(isTranscodeSourceFile('clip.gif')).toBe(true);
      expect(isTranscodeSourceFile('clip.GIF')).toBe(true);
      expect(isTranscodeSourceFile('clip.gifv')).toBe(true);
      expect(isTranscodeSourceFile('clip.GIFV')).toBe(true);
      expect(isTranscodeSourceFile('clip.mp4')).toBe(false);
    });
  });

  describe('findTranscodeCandidates', () => {
    it('recursively scans configured source directories', () => {
      const root = createFixtureRoot();
      writeFileSync(join(root, 'Gifs', 'a.gif'), GIF_HEADER);
      writeFileSync(join(root, 'Gifs', 'nested', 'b.gifv'), GIF_HEADER);
      writeFileSync(join(root, 'Media', 'c.gif'), GIF_HEADER);
      writeFileSync(join(root, 'Videos', 'd.gifv'), GIF_HEADER);
      writeFileSync(join(root, 'Media', 'ignore.mp4'), 'mp4');

      const candidates = findTranscodeCandidates(root, ['Gifs', 'Media', 'Videos']);

      expect(candidates).toEqual([
        join(root, 'Gifs', 'a.gif'),
        join(root, 'Gifs', 'nested', 'b.gifv'),
        join(root, 'Media', 'c.gif'),
        join(root, 'Videos', 'd.gifv'),
      ]);
    });
  });

  describe('buildOutputPath', () => {
    it('writes mp4 basename into the Videos folder', () => {
      const outputPath = buildOutputPath(
        '/tmp/downloads/Gifs/nested/foo.gif',
        '/tmp/downloads',
        'Videos',
      );

      expect(outputPath).toBe('/tmp/downloads/Videos/foo.mp4');
    });
  });

  describe('ensureFfmpegAvailable', () => {
    it('throws a clear error when ffmpeg is missing', async () => {
      const adapter = new MockFfmpegAdapter();
      adapter.available = false;

      await expect(ensureFfmpegAvailable(adapter)).rejects.toThrow(
        FfmpegNotFoundError,
      );
      await expect(ensureFfmpegAvailable(adapter)).rejects.toThrow(
        'brew install ffmpeg',
      );
    });
  });

  describe('transcodeFile', () => {
    it('dry-run lists the target without converting', async () => {
      const root = createFixtureRoot();
      const inputPath = join(root, 'Gifs', 'sample.gif');
      const outputPath = join(root, 'Videos', 'sample.mp4');
      writeFileSync(inputPath, GIF_HEADER);

      const adapter = new MockFfmpegAdapter();
      const result = await transcodeFile(inputPath, outputPath, adapter, {
        dryRun: true,
      });

      expect(result.status).toBe('dry-run');
      expect(adapter.transcodeCalls).toHaveLength(0);
      expect(existsSync(outputPath)).toBe(false);
    });

    it('converts a file and keeps the original by default', async () => {
      const root = createFixtureRoot();
      const inputPath = join(root, 'Gifs', 'sample.gif');
      const outputPath = join(root, 'Videos', 'sample.mp4');
      writeFileSync(inputPath, GIF_HEADER);

      const adapter = new MockFfmpegAdapter();
      const result = await transcodeFile(inputPath, outputPath, adapter);

      expect(result.status).toBe('converted');
      expect(existsSync(inputPath)).toBe(true);
      expect(existsSync(outputPath)).toBe(true);
      expect(adapter.transcodeCalls).toEqual([{ inputPath, outputPath }]);
    });

    it('deletes the original when deleteOriginal is enabled', async () => {
      const root = createFixtureRoot();
      const inputPath = join(root, 'Gifs', 'sample.gif');
      const outputPath = join(root, 'Videos', 'sample.mp4');
      writeFileSync(inputPath, GIF_HEADER);

      const adapter = new MockFfmpegAdapter();
      const result = await transcodeFile(inputPath, outputPath, adapter, {
        deleteOriginal: true,
      });

      expect(result.status).toBe('converted');
      expect(existsSync(inputPath)).toBe(false);
      expect(existsSync(outputPath)).toBe(true);
    });

    it('skips files that already have an mp4 output', async () => {
      const root = createFixtureRoot();
      const inputPath = join(root, 'Gifs', 'sample.gif');
      const outputPath = join(root, 'Videos', 'sample.mp4');
      writeFileSync(inputPath, GIF_HEADER);
      writeFileSync(outputPath, 'existing mp4');

      const adapter = new MockFfmpegAdapter();
      const result = await transcodeFile(inputPath, outputPath, adapter);

      expect(result.status).toBe('skipped');
      expect(adapter.transcodeCalls).toHaveLength(0);
    });

    it('returns failed status without throwing', async () => {
      const root = createFixtureRoot();
      const inputPath = join(root, 'Gifs', 'broken.gif');
      const outputPath = join(root, 'Videos', 'broken.mp4');
      writeFileSync(inputPath, GIF_HEADER);

      const adapter = new MockFfmpegAdapter();
      adapter.shouldFailFor = [inputPath];

      const result = await transcodeFile(inputPath, outputPath, adapter);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('mock transcode failed');
    });

    it('rejects html files before calling ffmpeg', async () => {
      const root = createFixtureRoot();
      const inputPath = join(root, 'Gifs', 'page.gifv');
      const outputPath = join(root, 'Videos', 'page.mp4');
      writeFileSync(inputPath, '<!doctype html><html></html>');

      const adapter = new MockFfmpegAdapter();
      const result = await transcodeFile(inputPath, outputPath, adapter);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('HTML');
      expect(adapter.transcodeCalls).toHaveLength(0);
    });
  });

  describe('transcodeDirectory', () => {
    it('processes all candidates and isolates per-file failures', async () => {
      const root = createFixtureRoot();
      const goodInput = join(root, 'Gifs', 'good.gif');
      const badInput = join(root, 'Gifs', 'bad.gif');
      writeFileSync(goodInput, GIF_HEADER);
      writeFileSync(badInput, GIF_HEADER);

      const adapter = new MockFfmpegAdapter();
      adapter.shouldFailFor = [badInput];

      const summary = await transcodeDirectory(adapter, {
        downloadsRoot: root,
        sourceDirectories: ['Gifs'],
        outputDirectory: 'Videos',
      });

      expect(summary.scanned).toBe(2);
      expect(summary.converted).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.results).toHaveLength(2);
    });

    it('does not require ffmpeg during dry-run', async () => {
      const root = createFixtureRoot();
      writeFileSync(join(root, 'Gifs', 'sample.gif'), GIF_HEADER);

      const adapter = new MockFfmpegAdapter();
      adapter.available = false;

      const summary = await transcodeDirectory(adapter, {
        downloadsRoot: root,
        sourceDirectories: ['Gifs'],
        outputDirectory: 'Videos',
        dryRun: true,
      });

      expect(summary.dryRun).toBe(1);
      expect(adapter.transcodeCalls).toHaveLength(0);
    });

    it('fails fast when ffmpeg is missing and dry-run is disabled', async () => {
      const adapter = new MockFfmpegAdapter();
      adapter.available = false;

      await expect(
        transcodeDirectory(adapter, { downloadsRoot: createFixtureRoot() }),
      ).rejects.toThrow(FfmpegNotFoundError);
    });
  });
});
