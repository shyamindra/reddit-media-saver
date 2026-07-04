import { existsSync, mkdirSync, readdirSync, renameSync } from 'fs';
import { join } from 'path';
import { loadAppConfig } from '../config/appConfig';
import { FilenameSimilarity } from '../utils/filenameSimilarity';

export interface OrganizeSummary {
  totalFiles: number;
  organizedFiles: number;
  groupsCreated: number;
}

export interface OrganizeOptions {
  dryRun?: boolean;
  similarityThresholds?: number[];
}

const DEFAULT_THRESHOLDS = [0.8, 0.6, 0.4];
const ORGANIZE_CATEGORIES = ['Images', 'Videos', 'Gifs', 'Notes'];

export function runOrganize(options: OrganizeOptions = {}): OrganizeSummary {
  const config = loadAppConfig();
  const thresholds = options.similarityThresholds ?? DEFAULT_THRESHOLDS;
  const summary: OrganizeSummary = { totalFiles: 0, organizedFiles: 0, groupsCreated: 0 };

  for (const category of ORGANIZE_CATEGORIES) {
    const categoryPath = join(config.paths.downloadsDir, category);
    if (!existsSync(categoryPath)) continue;

    const filenames = readdirSync(categoryPath).filter((f) => !f.startsWith('.'));
    if (filenames.length === 0) continue;

    summary.totalFiles += filenames.length;

    let groups: string[][] = [];
    for (const threshold of thresholds) {
      groups = FilenameSimilarity.groupBySimilarity(filenames, threshold);
      if (groups.length > 0) break;
    }

    for (const group of groups) {
      if (group.length < 2) continue;

      const groupName = FilenameSimilarity.generateGroupName(group);
      const groupPath = join(categoryPath, groupName);

      if (!options.dryRun) {
        mkdirSync(groupPath, { recursive: true });
      }

      let moved = 0;
      for (const filename of group) {
        const source = join(categoryPath, filename);
        const dest = join(groupPath, filename);
        if (!options.dryRun) {
          renameSync(source, dest);
        }
        moved++;
      }

      summary.organizedFiles += moved;
      summary.groupsCreated++;
    }
  }

  return summary;
}
