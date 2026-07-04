import { loadAppConfig } from '../config/appConfig';
import { downloadDirectMediaUrl } from '../download/directMediaDownload';
import type { DownloadItemResult, DownloadStrategy, LinkBatchItemType } from '../download/types';
import { resolveMediaFromPostUrl } from '../linkResolution/resolveFromPostUrl';
import { resolvedDirectDownloads } from '../linkResolution/resolvePostMedia';

export interface AxiosJsonStrategyOptions {
  browser: string;
}

function titleFromUrl(url: string): string {
  const match = url.match(/\/comments\/[^/]+\/([^/?]+)/);
  if (match?.[1] && match[1] !== 'comment') {
    return match[1].replace(/_/g, ' ').substring(0, 180);
  }
  return 'reddit_post';
}

function imageTitle(baseTitle: string, index: number, total: number): string {
  if (total <= 1) return baseTitle;
  return `${baseTitle}_${index + 1}`;
}

export function createAxiosJsonStrategy(options: AxiosJsonStrategyOptions): DownloadStrategy {
  const config = loadAppConfig();
  const outputDirs = {
    media: config.paths.output.media,
    gifs: config.paths.output.gifs,
    videos: config.paths.output.videos,
  };

  return {
    async downloadUrl(url: string, type: LinkBatchItemType): Promise<DownloadItemResult> {
      const fallbackTitle = titleFromUrl(url);
      console.log(`\n📥 ${type} (axios-json): ${fallbackTitle}`);
      console.log(`   🔗 ${url}`);

      const resolved = resolvedDirectDownloads(
        await resolveMediaFromPostUrl(url, { useCookies: true, browser: options.browser }),
      );

      if (resolved.length === 0) {
        console.log('   ❌ No direct media URLs resolved from JSON');
        return { url, success: false, error: 'No media resolved from post JSON' };
      }

      const savedPaths: string[] = [];

      for (let i = 0; i < resolved.length; i++) {
        const media = resolved[i];
        const title = imageTitle(media.title ?? fallbackTitle, i, resolved.length);
        try {
          const filePath = await downloadDirectMediaUrl(media.url, title, outputDirs);
          savedPaths.push(filePath);
          console.log(`   ✅ Image fallback (json): ${filePath}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Direct download failed';
          console.log(`   ⚠️  JSON download failed for ${media.url}: ${message}`);
        }
      }

      if (savedPaths.length === 0) {
        return { url, success: false, error: 'All resolved media downloads failed' };
      }

      return { url, success: true, filePath: savedPaths[0] };
    },
  };
}
