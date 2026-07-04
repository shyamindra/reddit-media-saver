import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { loadAppConfig } from '../config/appConfig';
import { validateMediaBuffer } from './mediaContentValidation';
import { resolveDirectMediaUrl } from '../linkResolution/normalizeMediaUrl';

export async function downloadDirectMediaUrl(
  mediaUrl: string,
  title: string,
  outputDirs: { media: string; gifs: string; videos: string },
): Promise<string> {
  const config = loadAppConfig();
  const resolvedUrl = await resolveDirectMediaUrl(mediaUrl);

  const extMatch = resolvedUrl.match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
  const ext = extMatch ? extMatch[1] : 'bin';

  let outputDir = outputDirs.media;
  if (/\.gif$/i.test(resolvedUrl)) outputDir = outputDirs.gifs;
  else if (/\.(mp4|webm|mov)$/i.test(resolvedUrl)) outputDir = outputDirs.videos;

  mkdirSync(outputDir, { recursive: true });
  const filePath = join(outputDir, `${title}.${ext}`);

  if (existsSync(filePath)) {
    return filePath;
  }

  const response = await axios.get(resolvedUrl, {
    responseType: 'arraybuffer',
    timeout: 60_000,
    headers: {
      'User-Agent': config.userAgent,
      Referer: 'https://www.reddit.com/',
    },
    validateStatus: (status) => status < 500,
  });

  if (response.status !== 200) {
    throw new Error(`Download failed with HTTP ${response.status}`);
  }

  const data = Buffer.from(response.data);
  validateMediaBuffer(data);

  await new Promise<void>((resolve, reject) => {
    const writer = createWriteStream(filePath);
    writer.write(data);
    writer.end();
    writer.on('finish', () => resolve());
    writer.on('error', reject);
  });

  return filePath;
}
