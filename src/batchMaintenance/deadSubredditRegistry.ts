import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface DeadSubredditRegistryFile {
  subreddits: string[];
}

export interface DeadSubredditLogStats {
  fails: number;
  successes: number;
}

export interface AnalyzeDeadSubredditsResult {
  candidates: string[];
  stats: Record<string, DeadSubredditLogStats>;
}

export interface UpdateDeadSubredditRegistryOptions {
  registryPath: string;
  logDir: string;
  dryRun?: boolean;
  fallbackSubreddits?: Iterable<string>;
  minFails?: number;
}

export interface UpdateDeadSubredditRegistryResult {
  dryRun: boolean;
  candidates: string[];
  added: string[];
  total: number;
  registryPath: string;
}

const LOG_SUCCESS_PATTERN =
  /✅ Saved:|✅ Image fallback|✅ Motion fallback|✅ Video fallback|✅ Comment saved:|already been recorded/;
const LOG_DEAD_FAIL_PATTERNS = [/404: Not Found/, /Private subreddit/i];

function normalizeSubredditName(subreddit: string): string {
  return subreddit.toLowerCase();
}

export function loadDeadSubredditRegistry(registryPath: string): Set<string> {
  if (!existsSync(registryPath)) {
    return new Set();
  }

  const parsed = JSON.parse(readFileSync(registryPath, 'utf-8')) as DeadSubredditRegistryFile;
  return new Set(parsed.subreddits.map(normalizeSubredditName));
}

export function loadDeadSubredditRegistryWithFallback(
  registryPath: string,
  fallbackSubreddits: Iterable<string>,
): Set<string> {
  const loaded = loadDeadSubredditRegistry(registryPath);
  if (loaded.size > 0) {
    return loaded;
  }

  return new Set([...fallbackSubreddits].map(normalizeSubredditName));
}

export function saveDeadSubredditRegistry(registryPath: string, subreddits: Iterable<string>): void {
  const normalized = [...new Set([...subreddits].map(normalizeSubredditName))].sort((a, b) =>
    a.localeCompare(b),
  );

  const payload: DeadSubredditRegistryFile = { subreddits: normalized };
  writeFileSync(registryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

export function analyzeDeadSubredditsFromLogs(logDir: string, minFails = 2): AnalyzeDeadSubredditsResult {
  const subFail = new Map<string, number>();
  const subSuccess = new Map<string, number>();

  if (!existsSync(logDir)) {
    return { candidates: [], stats: {} };
  }

  for (const fileName of readdirSync(logDir).filter((name) => name.endsWith('.log'))) {
    const log = readFileSync(join(logDir, fileName), 'utf-8');
    const blocks = log.split(/(?=🔗 https:\/\/www\.reddit\.com\/)/);

    for (const block of blocks) {
      const urlMatch = block.match(/🔗 (https:\/\/www\.reddit\.com\/r\/([^/]+)\/[^\s]+)/);
      if (!urlMatch) continue;

      const subreddit = normalizeSubredditName(urlMatch[2]);
      if (LOG_SUCCESS_PATTERN.test(block)) {
        subSuccess.set(subreddit, (subSuccess.get(subreddit) ?? 0) + 1);
      } else if (LOG_DEAD_FAIL_PATTERNS.some((pattern) => pattern.test(block))) {
        subFail.set(subreddit, (subFail.get(subreddit) ?? 0) + 1);
      }
    }
  }

  const candidates = [...subFail.keys()]
    .filter((sub) => (subFail.get(sub) ?? 0) >= minFails && (subSuccess.get(sub) ?? 0) === 0)
    .sort((a, b) => a.localeCompare(b));

  const stats: Record<string, DeadSubredditLogStats> = {};
  for (const subreddit of new Set([...subFail.keys(), ...subSuccess.keys()])) {
    stats[subreddit] = {
      fails: subFail.get(subreddit) ?? 0,
      successes: subSuccess.get(subreddit) ?? 0,
    };
  }

  return { candidates, stats };
}

export function updateDeadSubredditRegistry(
  options: UpdateDeadSubredditRegistryOptions,
): UpdateDeadSubredditRegistryResult {
  const fallback = options.fallbackSubreddits ?? [];
  const existing = loadDeadSubredditRegistryWithFallback(options.registryPath, fallback);
  const { candidates } = analyzeDeadSubredditsFromLogs(options.logDir, options.minFails ?? 2);

  const added = candidates.filter((subreddit) => !existing.has(normalizeSubredditName(subreddit)));
  const merged = new Set(existing);
  for (const subreddit of candidates) {
    merged.add(normalizeSubredditName(subreddit));
  }

  const dryRun = options.dryRun ?? false;
  if (!dryRun) {
    saveDeadSubredditRegistry(options.registryPath, merged);
  }

  return {
    dryRun,
    candidates,
    added,
    total: merged.size,
    registryPath: options.registryPath,
  };
}

export function shouldSkipSubredditInRegistry(subreddit: string, registry: Set<string>): boolean {
  return registry.has(normalizeSubredditName(subreddit));
}
