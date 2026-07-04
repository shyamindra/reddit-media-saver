import { existsSync, mkdtempSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { appendFailedDownload, loadSkippedFailureUrls } from './failureRegistry';

describe('failureRegistry', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'failure-registry-'));
    filePath = join(tempDir, 'failed.txt');
  });

  it('skips URLs with non-retryable failure reasons', () => {
    appendFailedDownload(filePath, 'https://example.com/dead', 'gone');
    appendFailedDownload(filePath, 'https://example.com/hot', 'rate_limit');

    const skipped = loadSkippedFailureUrls(filePath);
    expect(skipped.has('https://example.com/dead')).toBe(true);
    expect(skipped.has('https://example.com/hot')).toBe(false);
  });

  it('treats legacy plain-url lines as permanent skips', () => {
    const { writeFileSync } = require('fs');
    writeFileSync(filePath, 'https://example.com/legacy-fail\n', 'utf8');

    expect(loadSkippedFailureUrls(filePath).has('https://example.com/legacy-fail')).toBe(true);
  });
});
