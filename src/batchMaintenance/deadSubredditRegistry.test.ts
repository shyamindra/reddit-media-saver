import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  analyzeDeadSubredditsFromLogs,
  loadDeadSubredditRegistry,
  loadDeadSubredditRegistryWithFallback,
  updateDeadSubredditRegistry,
} from './deadSubredditRegistry';

describe('loadDeadSubredditRegistry', () => {
  it('reads subreddit names from a JSON registry file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dead-sub-registry-'));
    const registryPath = join(dir, 'dead-subreddits.json');

    writeFileSync(
      registryPath,
      JSON.stringify({ subreddits: ['casual_random', 'HarleyLove'] }),
      'utf-8',
    );

    const registry = loadDeadSubredditRegistry(registryPath);

    expect(registry.has('casual_random')).toBe(true);
    expect(registry.has('harleylove')).toBe(true);
    expect(registry.size).toBe(2);
  });

  it('falls back to bootstrap subs when registry file is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dead-sub-fallback-'));
    const registryPath = join(dir, 'missing.json');

    const registry = loadDeadSubredditRegistryWithFallback(registryPath, ['casual_random']);

    expect(registry.has('casual_random')).toBe(true);
    expect(registry.size).toBe(1);
  });
});

describe('analyzeDeadSubredditsFromLogs', () => {
  it('finds subs with 404/private failures and zero successes', () => {
    const logDir = mkdtempSync(join(tmpdir(), 'dead-sub-logs-'));
    writeFileSync(
      join(logDir, 'batch-run.log'),
      [
        '🔗 https://www.reddit.com/r/DeadSub/comments/a1/post/',
        '   ❌ ERROR: 404: Not Found',
        '🔗 https://www.reddit.com/r/DeadSub/comments/a2/post/',
        '   ❌ ERROR: 404: Not Found',
        '🔗 https://www.reddit.com/r/AliveSub/comments/b1/post/',
        '   ✅ Saved: downloads/Videos/b1.mp4',
        '🔗 https://www.reddit.com/r/AliveSub/comments/b2/post/',
        '   ❌ ERROR: 404: Not Found',
      ].join('\n'),
      'utf-8',
    );

    const result = analyzeDeadSubredditsFromLogs(logDir);

    expect(result.candidates).toEqual(['deadsub']);
    expect(result.stats.deadsub).toEqual({ fails: 2, successes: 0 });
    expect(result.stats.alivesub).toEqual({ fails: 1, successes: 1 });
  });
});

describe('updateDeadSubredditRegistry', () => {
  it('merges log-detected dead subs into the registry file', () => {
    const root = mkdtempSync(join(tmpdir(), 'dead-sub-update-'));
    const logDir = join(root, 'logs');
    const registryPath = join(root, 'dead-subreddits.json');
    mkdirSync(logDir, { recursive: true });

    writeFileSync(
      registryPath,
      JSON.stringify({ subreddits: ['casual_random'] }),
      'utf-8',
    );

    writeFileSync(
      join(logDir, 'batch-run.log'),
      [
        '🔗 https://www.reddit.com/r/NewDeadSub/comments/a1/post/',
        '   ❌ ERROR: Private subreddit',
        '🔗 https://www.reddit.com/r/NewDeadSub/comments/a2/post/',
        '   ❌ ERROR: Private subreddit',
      ].join('\n'),
      'utf-8',
    );

    const result = updateDeadSubredditRegistry({
      registryPath,
      logDir,
      dryRun: false,
    });

    expect(result.added).toEqual(['newdeadsub']);
    expect(result.total).toBe(2);

    const saved = JSON.parse(readFileSync(registryPath, 'utf-8')) as { subreddits: string[] };
    expect(saved.subreddits).toEqual(['casual_random', 'newdeadsub']);
  });

  it('dry-run reports candidates without writing the registry file', () => {
    const root = mkdtempSync(join(tmpdir(), 'dead-sub-dry-'));
    const logDir = join(root, 'logs');
    const registryPath = join(root, 'dead-subreddits.json');
    mkdirSync(logDir, { recursive: true });

    writeFileSync(
      join(logDir, 'batch-run.log'),
      [
        '🔗 https://www.reddit.com/r/BrandNewDead/comments/a1/post/',
        '   ❌ ERROR: 404: Not Found',
        '🔗 https://www.reddit.com/r/BrandNewDead/comments/a2/post/',
        '   ❌ ERROR: 404: Not Found',
      ].join('\n'),
      'utf-8',
    );

    const result = updateDeadSubredditRegistry({
      registryPath,
      logDir,
      dryRun: true,
      fallbackSubreddits: ['seed_sub'],
    });

    expect(result.dryRun).toBe(true);
    expect(result.added).toEqual(['brandnewdead']);
    expect(result.total).toBe(2);

    expect(() => readFileSync(registryPath, 'utf-8')).toThrow();
  });
});
