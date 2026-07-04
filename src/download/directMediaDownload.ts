import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { loadAppConfig } from '../config/appConfig';

export async function downloadDirectMediaUrl(
  mediaUrl: string,
  title: string,
  outputDirs: { media: string; gifs: string; videos: string },
): Promise<string> {
  const config = loadAppConfig();
  const extMatch = mediaUrl.match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
  const ext = extMatch ? extMatch[1] : 'bin';

  let outputDir = outputDirs.media;
  if (/\.gif$/i.test(mediaUrl)) outputDir = outputDirs.gifs;
  else if (/\.(mp4|webm|mov)$/i.test(mediaUrl)) outputDir = outputDirs.videos;

  mkdirSync(outputDir, { recursive: true });
  const filePath = join(outputDir, `${title}.${ext}`);

  if (existsSync(filePath)) {
    return filePath;
  }

  const response = await axios.get(mediaUrl, {
    responseType: 'stream',
    timeout: 60_000,
    headers: { 'User-Agent': config.userAgent },
  });

  await new Promise<void>((resolve, reject) => {
    const writer = createWriteStream(filePath);
    response.data.pipe(writer);
    writer.on('finish', () => resolve());
    writer.on('error', reject);
  });

  return filePath;
}
