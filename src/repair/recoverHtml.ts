import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { loadAppConfig } from '../config/appConfig';
import { extractVideoUrlsFromHtml, isHtmlContent } from './htmlContent';
import { walkNotesTextFiles } from './walkFiles';

export interface RecoverHtmlSummary {
  filesProcessed: number;
  urlsFound: number;
  downloaded: number;
}

export interface RecoverHtmlOptions {
  downloadVideo?: (url: string, filename: string) => Promise<boolean>;
}

function videoFilenameFromUrl(url: string, index: number): string {
  if (url.includes('redgifs.com')) {
    const match = url.match(/https:\/\/media\.redgifs\.com\/([^/]+)/);
    if (match) {
      let name = match[1];
      if (name.endsWith('.mp4')) name = name.slice(0, -4);
      return `${name}.mp4`;
    }
  }

  if (url.includes('v.redd.it')) {
    const match = url.match(/https:\/\/v\.redd\.it\/([a-zA-Z0-9]+)/);
    if (match) return `reddit_${match[1]}.mp4`;
  }

  if (url.includes('packaged-media.redd.it')) {
    const match = url.match(/https:\/\/packaged-media\.redd\.it\/([a-zA-Z0-9]+)\/pb\/m2-res_([0-9]+)p\.mp4/);
    if (match) return `reddit_packaged_${match[1]}_${match[2]}p.mp4`;
  }

  try {
    const pathname = new URL(url).pathname.split('/').pop() ?? 'video';
    return `extracted_${index}_${pathname}`;
  } catch {
    return `extracted_${index}_video.mp4`;
  }
}

async function defaultDownloadVideo(url: string, filename: string): Promise<boolean> {
  const config = loadAppConfig();
  const outputPath = join(config.paths.output.videos, filename);

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': config.userAgent,
        Accept: 'video/*,*/*',
        Referer: 'https://www.reddit.com/',
        Origin: 'https://www.reddit.com',
      },
      timeout: 30_000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });

    if (response.status !== 200) return false;
    writeFileSync(outputPath, response.data);
    return true;
  } catch {
    return false;
  }
}

export async function runRecoverHtml(options: RecoverHtmlOptions = {}): Promise<RecoverHtmlSummary> {
  const download = options.downloadVideo ?? defaultDownloadVideo;
  const summary: RecoverHtmlSummary = { filesProcessed: 0, urlsFound: 0, downloaded: 0 };

  for (const file of walkNotesTextFiles()) {
    const content = readFileSync(file.filePath, 'utf8');
    if (!isHtmlContent(content)) continue;

    summary.filesProcessed++;
    const urls = extractVideoUrlsFromHtml(content);
    summary.urlsFound += urls.length;

    for (let i = 0; i < urls.length; i++) {
      const filename = videoFilenameFromUrl(urls[i], i);
      if (await download(urls[i], filename)) {
        summary.downloaded++;
      }
    }
  }

  return summary;
}
