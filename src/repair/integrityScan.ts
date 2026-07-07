import { readFileSync, statSync } from 'fs';
import { isHtmlContent } from './htmlContent';
import { walkVideoFiles } from './walkFiles';

export type IntegrityIssueKind = 'html_content' | 'empty' | 'probe_failed' | 'no_video_stream';

export interface IntegrityIssue {
  filePath: string;
  fileName: string;
  issue: IntegrityIssueKind;
  detail?: string;
}

export interface IntegrityScanSummary {
  scanned: number;
  issues: IntegrityIssue[];
}

export interface VideoProbeResult {
  hasVideoStream: boolean;
  detail?: string;
}

export interface IntegrityScanOptions {
  dryRun?: boolean;
  probeVideo?: (filePath: string) => Promise<VideoProbeResult>;
}

export function detectLocalMp4Issue(filePath: string): IntegrityIssue | null {
  const stats = statSync(filePath);
  if (stats.size === 0) {
    return { filePath, fileName: filePath.split('/').pop() ?? filePath, issue: 'empty' };
  }

  const sample = readFileSync(filePath).subarray(0, Math.min(1024, stats.size)).toString('utf8');
  if (isHtmlContent(sample)) {
    return {
      filePath,
      fileName: filePath.split('/').pop() ?? filePath,
      issue: 'html_content',
      detail: 'File begins with HTML content',
    };
  }

  return null;
}

export async function runIntegrityScan(
  options: IntegrityScanOptions = {},
): Promise<IntegrityScanSummary> {
  const files = walkVideoFiles();
  const issues: IntegrityIssue[] = [];

  for (const file of files) {
    const localIssue = detectLocalMp4Issue(file.filePath);
    if (localIssue) {
      issues.push(localIssue);
      continue;
    }

    if (options.probeVideo) {
      try {
        const probe = await options.probeVideo(file.filePath);
        if (!probe.hasVideoStream) {
          issues.push({
            filePath: file.filePath,
            fileName: file.fileName,
            issue: 'no_video_stream',
            detail: probe.detail,
          });
        }
      } catch (error) {
        issues.push({
          filePath: file.filePath,
          fileName: file.fileName,
          issue: 'probe_failed',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { scanned: files.length, issues };
}
