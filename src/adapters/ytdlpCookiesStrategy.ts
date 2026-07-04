import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loadAppConfig } from '../config/appConfig';
import { downloadDirectMediaUrl } from '../download/directMediaDownload';
import type { DownloadItemResult, DownloadStrategy, LinkBatchItemType } from '../download/types';
import { resolveMediaFromPostUrl } from '../linkResolution/resolveFromPostUrl';
import { resolvedDirectDownloads } from '../linkResolution/resolvePostMedia';
import {
  countRedirectLoopHits,
  REDIRECT_LOOP_ABORT_THRESHOLD,
  resolveYtdlpBinary,
} from '../utils/ytdlp';

const MEDIA_HOSTS =
  /https?:\/\/(?:[a-z0-9-]+\.)?(?:redd\.it|redditmedia\.com|redgifs\.com|imgur\.com|gfycat\.com)\/[^\s"'<>]+/gi;

export interface YtdlpCookiesStrategyOptions {
  browser: string;
  archiveFile: string;
  perUrlTimeoutMs: number;
}

export function extractMediaUrlsFromYtdlpOutput(output: string): string[] {
  const found = new Set<string>();

  const mediaRedirect = /reddit\.com\/media\?url=([^&\s"'<>]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = mediaRedirect.exec(output)) !== null) {
    try {
      found.add(decodeURIComponent(match[1]));
    } catch {
      // ignore malformed URLs
    }
  }

  const directMatches = output.match(MEDIA_HOSTS) ?? [];
  for (const url of directMatches) {
    found.add(url.replace(/[),.;]+$/, ''));
  }

  return [...found];
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 180);
}

function titleFromUrl(url: string): string {
  const match = url.match(/\/comments\/[^/]+\/([^/?]+)/);
  if (match?.[1] && match[1] !== 'comment') {
    return sanitizeFilename(match[1].replace(/_/g, ' '));
  }
  return 'reddit_post';
}

export function createYtdlpCookiesStrategy(
  options: YtdlpCookiesStrategyOptions,
): DownloadStrategy {
  const config = loadAppConfig();
  const videoDir = config.paths.output.videos;
  const mediaDir = config.paths.output.media;
  const notesDir = config.paths.output.notes;
  const ytdlpBin = resolveYtdlpBinary();

  for (const dir of [videoDir, mediaDir, notesDir, config.paths.failedRequestsDir]) {
    mkdirSync(dir, { recursive: true });
  }

  async function runYtdlp(
    args: string[],
    retriesOn429 = 3,
  ): Promise<{ code: number; stdout: string; stderr: string; timedOut?: boolean }> {
    for (let attempt = 0; attempt <= retriesOn429; attempt++) {
      const result = await new Promise<{
        code: number;
        stdout: string;
        stderr: string;
        timedOut?: boolean;
      }>((resolve, reject) => {
        const child = spawn(ytdlpBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        let redirectLoopCount = 0;

        const timeout = setTimeout(() => {
          timedOut = true;
          console.log(
            `\n   ⏱️  URL exceeded ${options.perUrlTimeoutMs / 1000}s — killing yt-dlp and moving on.`,
          );
          child.kill('SIGKILL');
        }, options.perUrlTimeoutMs);

        const checkRedirectLoop = (text: string): void => {
          redirectLoopCount += countRedirectLoopHits(text);
          if (redirectLoopCount > REDIRECT_LOOP_ABORT_THRESHOLD) {
            timedOut = true;
            console.log(`\n   🔁 Redirect loop detected — killing yt-dlp and moving on.`);
            child.kill('SIGKILL');
          }
        };

        child.stdout.on('data', (chunk) => {
          const text = chunk.toString();
          stdout += text;
          process.stdout.write(text);
          checkRedirectLoop(text);
        });

        child.stderr.on('data', (chunk) => {
          const text = chunk.toString();
          stderr += text;
          process.stderr.write(text);
          checkRedirectLoop(text);
        });

        child.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        child.on('close', (code) => {
          clearTimeout(timeout);
          resolve({ code: code ?? 1, stdout, stderr, timedOut });
        });
      });

      if (result.timedOut) {
        return result;
      }

      const combined = `${result.stdout}\n${result.stderr}`;
      const is429 = combined.includes('429') || combined.includes('Too Many Requests');

      if (result.code === 0 || !is429 || attempt === retriesOn429) {
        return result;
      }

      const waitMs = [90_000, 180_000, 300_000][attempt] ?? 300_000;
      console.log(
        `\n   ⏳ Rate limited (429). Waiting ${waitMs / 1000}s before retry ${attempt + 1}/${retriesOn429}...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    return { code: 1, stdout: '', stderr: 'Rate limit retries exhausted' };
  }

  async function downloadDirectMedia(mediaUrl: string, title: string): Promise<string> {
    return downloadDirectMediaUrl(mediaUrl, title, {
      media: mediaDir,
      gifs: config.paths.output.gifs,
      videos: videoDir,
    });
  }

  async function downloadResolvedFromJson(
    postUrl: string,
    baseTitle: string,
  ): Promise<DownloadItemResult | null> {
    const resolved = resolvedDirectDownloads(
      await resolveMediaFromPostUrl(postUrl, { useCookies: true, browser: options.browser }),
    );
    if (resolved.length === 0) return null;

    const savedPaths: string[] = [];

    for (let i = 0; i < resolved.length; i++) {
      const media = resolved[i];
      const title = imageTitle(media.title ?? baseTitle, i, resolved.length);
      try {
        const filePath = await downloadDirectMedia(media.url, title);
        savedPaths.push(filePath);
        console.log(`   ✅ Image fallback (json): ${filePath}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Direct download failed';
        console.log(`   ⚠️  JSON resolved download failed for ${media.url}: ${message}`);
      }
    }

    if (savedPaths.length === 0) return null;
    return { url: postUrl, success: true, filePath: savedPaths[0] };
  }

  async function downloadWithYtdlp(url: string): Promise<DownloadItemResult> {
    const outputTemplate = join(videoDir, '%(title)s.%(ext)s');
    const args = [
      '--cookies-from-browser',
      options.browser,
      '-o',
      outputTemplate,
      '--no-playlist',
      '--no-warnings',
      '--retries',
      '3',
      '--merge-output-format',
      'mp4',
      '--sleep-interval',
      '2',
      '--max-sleep-interval',
      '6',
      '--download-archive',
      options.archiveFile,
      url,
    ];

    const { code, stdout, stderr } = await runYtdlp(args);
    const combined = `${stdout}\n${stderr}`;

    if (code === 0) {
      const destination = combined.match(/Destination: (.+)/)?.[1];
      const merged = combined.match(/Merging formats into "(.+?)"/)?.[1];
      return { url, success: true, filePath: merged ?? destination };
    }

    return { url, success: false, error: combined };
  }

  async function downloadCommentText(url: string, title: string): Promise<DownloadItemResult> {
    try {
      const { stdout, stderr, code } = await runYtdlp([
        '--cookies-from-browser',
        options.browser,
        '--print',
        'description',
        '--no-download',
        '--no-warnings',
        url,
      ]);

      const text = stdout.trim() || stderr.trim();
      if (!text || code !== 0) {
        return { url, success: false, error: 'Could not extract comment text' };
      }

      const filePath = join(notesDir, `${title}.txt`);
      writeFileSync(filePath, `${url}\n\n${text}`, 'utf8');
      return { url, success: true, filePath };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { url, success: false, error: message };
    }
  }

  function imageTitle(baseTitle: string, index: number, total: number): string {
    if (total <= 1) return baseTitle;
    return `${baseTitle}_${index + 1}`;
  }

  async function downloadGalleryImages(
    postUrl: string,
    baseTitle: string,
  ): Promise<DownloadItemResult | null> {
    try {
      return await downloadResolvedFromJson(postUrl, baseTitle);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'JSON fetch failed';
      console.log(`   ⚠️  Gallery JSON fallback failed: ${message}`);
      return null;
    }
  }

  return {
    async downloadUrl(url: string, type: LinkBatchItemType): Promise<DownloadItemResult> {
      const fallbackTitle = titleFromUrl(url);
      console.log(`\n📥 ${type}: ${fallbackTitle}`);
      console.log(`   🔗 ${url}`);

      const ytdlpResult = await downloadWithYtdlp(url);
      if (ytdlpResult.success) {
        console.log(`   ✅ Saved: ${ytdlpResult.filePath}`);
        return ytdlpResult;
      }

      const mediaUrls = extractMediaUrlsFromYtdlpOutput(ytdlpResult.error ?? '');
      if (mediaUrls.length > 0) {
        for (const mediaUrl of mediaUrls) {
          try {
            const filePath = await downloadDirectMedia(mediaUrl, fallbackTitle);
            console.log(`   ✅ Image fallback: ${filePath}`);
            return { url, success: true, filePath };
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Direct download failed';
            console.log(`   ⚠️  Direct download failed for ${mediaUrl}: ${message}`);
          }
        }
      }

      const galleryResult = await downloadGalleryImages(url, fallbackTitle);
      if (galleryResult) {
        return galleryResult;
      }

      if (type === 'comment') {
        const commentResult = await downloadCommentText(url, fallbackTitle);
        if (commentResult.success) {
          console.log(`   ✅ Comment saved: ${commentResult.filePath}`);
          return commentResult;
        }
      }

      console.log(`   ❌ Failed`);
      return { url, success: false, error: ytdlpResult.error ?? 'Download failed' };
    },
  };
}
