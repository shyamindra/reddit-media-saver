import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from 'fs';
import { join } from 'path';
import { loadAppConfig } from '../config/appConfig';
import { DEFAULT_SUBREDDIT_PATTERNS } from './defaultSubredditPatterns';

export interface NamedPatternGroup {
  folderName: string;
  patterns: string[];
}

export interface PatternOrganizeGroup {
  folderName: string;
  pattern: string;
  files: string[];
}

export interface OrganizeByPatternSummary {
  totalFiles: number;
  organizedFiles: number;
  groupsCreated: number;
  groups: PatternOrganizeGroup[];
}

export interface OrganizeByPatternOptions {
  patterns?: string[];
  namedGroups?: NamedPatternGroup[];
  categories?: string[];
  minGroupSize?: number;
  dryRun?: boolean;
  /** Move unmatched video files into downloads/Videos/other */
  collectOther?: boolean;
}

interface FileEntry {
  name: string;
  fullPath: string;
}

export function sanitizePatternFolderName(pattern: string): string {
  return pattern.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function groupFilenamesByPatterns(
  filenames: string[],
  patterns: string[],
): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const filename of filenames) {
    for (const pattern of patterns) {
      if (filename.includes(pattern)) {
        const bucket = groups.get(pattern) ?? [];
        bucket.push(filename);
        groups.set(pattern, bucket);
        break;
      }
    }
  }

  return groups;
}

export function groupFilenamesByNamedGroups(
  filenames: string[],
  namedGroups: NamedPatternGroup[],
): Map<string, { folderName: string; files: string[] }> {
  const groups = new Map<string, { folderName: string; files: string[] }>();
  const processed = new Set<string>();

  for (const group of namedGroups) {
    const matches = filenames.filter((filename) => {
      if (processed.has(filename)) return false;
      const lower = filename.toLowerCase();
      return group.patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
    });

    if (matches.length === 0) continue;

    for (const filename of matches) {
      processed.add(filename);
    }

    groups.set(group.folderName, { folderName: group.folderName, files: matches });
  }

  return groups;
}

function listTopLevelFiles(categoryPath: string): FileEntry[] {
  if (!existsSync(categoryPath)) return [];

  return readdirSync(categoryPath)
    .filter((entry) => !entry.startsWith('.'))
    .map((entry) => {
      const fullPath = join(categoryPath, entry);
      return { name: entry, fullPath };
    })
    .filter((entry) => existsSync(entry.fullPath) && statSync(entry.fullPath).isFile());
}

function listVideoFilesIncludingOther(videosDir: string): FileEntry[] {
  const files = listTopLevelFiles(videosDir).filter((entry) => entry.name !== 'other');
  const otherDir = join(videosDir, 'other');

  if (existsSync(otherDir)) {
    files.push(...listTopLevelFiles(otherDir));
  }

  return files;
}

function moveFiles(
  files: string[],
  fileEntries: FileEntry[],
  groupPath: string,
  dryRun: boolean,
): number {
  let moved = 0;

  for (const filename of files) {
    const entry = fileEntries.find((file) => file.name === filename);
    if (!entry) continue;

    if (!dryRun) {
      mkdirSync(groupPath, { recursive: true });
      renameSync(entry.fullPath, join(groupPath, filename));
    }
    moved++;
  }

  return moved;
}

export function runOrganizeByPattern(options: OrganizeByPatternOptions = {}): OrganizeByPatternSummary {
  const config = loadAppConfig();
  const categories = options.categories ?? ['Images', 'Videos', 'Gifs', 'Notes'];
  const minGroupSize = options.minGroupSize ?? 2;
  const patterns = options.patterns ?? [...DEFAULT_SUBREDDIT_PATTERNS];
  const summary: OrganizeByPatternSummary = {
    totalFiles: 0,
    organizedFiles: 0,
    groupsCreated: 0,
    groups: [],
  };

  for (const category of categories) {
    const categoryPath = join(config.paths.downloadsDir, category);
    const fileEntries =
      category === 'Videos' && options.collectOther
        ? listVideoFilesIncludingOther(categoryPath)
        : listTopLevelFiles(categoryPath);

    if (fileEntries.length === 0) continue;

    summary.totalFiles += fileEntries.length;
    const filenames = fileEntries.map((entry) => entry.name);

    if (options.namedGroups && options.namedGroups.length > 0) {
      const named = groupFilenamesByNamedGroups(filenames, options.namedGroups);
      for (const group of named.values()) {
        if (group.files.length < minGroupSize) continue;
        const groupPath = join(categoryPath, group.folderName);
        const moved = moveFiles(group.files, fileEntries, groupPath, options.dryRun ?? false);
        if (moved === 0) continue;

        summary.organizedFiles += moved;
        summary.groupsCreated++;
        summary.groups.push({
          folderName: group.folderName,
          pattern: group.folderName,
          files: group.files,
        });
      }
    } else {
      const patternGroups = groupFilenamesByPatterns(filenames, patterns);
      for (const [pattern, files] of patternGroups.entries()) {
        if (files.length < minGroupSize) continue;

        const folderName = sanitizePatternFolderName(pattern);
        const groupPath = join(categoryPath, folderName);
        const moved = moveFiles(files, fileEntries, groupPath, options.dryRun ?? false);
        if (moved === 0) continue;

        summary.organizedFiles += moved;
        summary.groupsCreated++;
        summary.groups.push({ folderName, pattern, files });
      }
    }

    if (options.collectOther && category === 'Videos') {
      const organized = new Set(summary.groups.flatMap((group) => group.files));
      const remaining = fileEntries.filter((entry) => !organized.has(entry.name));
      if (remaining.length > 0) {
        const otherPath = join(categoryPath, 'other');
        const moved = moveFiles(
          remaining.map((entry) => entry.name),
          fileEntries,
          otherPath,
          options.dryRun ?? false,
        );
        if (moved > 0) {
          summary.organizedFiles += moved;
          summary.groupsCreated++;
          summary.groups.push({
            folderName: 'other',
            pattern: 'unorganized',
            files: remaining.map((entry) => entry.name),
          });
        }
      }
    }
  }

  return summary;
}
