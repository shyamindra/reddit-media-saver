import { RealFfmpegAdapter } from '../adapters/ffmpegAdapter';
import { FfmpegNotFoundError } from '../adapters/ffmpegAdapter';
import {
  DEFAULT_DOWNLOADS_ROOT,
  DEFAULT_SOURCE_DIRECTORIES,
  transcodeDirectory,
} from '../services/mediaTranscodeService';

interface CliOptions {
  dryRun: boolean;
  deleteOriginal: boolean;
  downloadsRoot: string;
  sourceDirectories: string[];
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    deleteOriginal: false,
    downloadsRoot: DEFAULT_DOWNLOADS_ROOT,
    sourceDirectories: [...DEFAULT_SOURCE_DIRECTORIES],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--delete-original') {
      options.deleteOriginal = true;
      continue;
    }

    if (arg === '--downloads-root') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--downloads-root requires a path');
      }
      options.downloadsRoot = value;
      index += 1;
      continue;
    }

    if (arg === '--source-dirs') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--source-dirs requires a comma-separated list');
      }
      options.sourceDirectories = value.split(',').map((entry) => entry.trim());
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log(`Convert local .gif and .gifv files to .mp4 in downloads/Videos.

Usage:
  npm run transcode-gifs -- [options]

Options:
  --dry-run            List targets without converting
  --delete-original    Delete source files after successful conversion
  --downloads-root     Root downloads folder (default: downloads)
  --source-dirs        Comma-separated scan folders (default: Gifs,Media,Videos)
  -h, --help           Show this help message
`);
}

function formatResultLine(inputPath: string, outputPath: string, status: string): string {
  return `${status.padEnd(10)} ${inputPath} -> ${outputPath}`;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const adapter = new RealFfmpegAdapter();

  console.log('🎬 GIF/GIFV to MP4 transcode\n');
  console.log(`   Downloads root: ${options.downloadsRoot}`);
  console.log(`   Scan folders:   ${options.sourceDirectories.join(', ')}`);
  console.log(`   Dry run:        ${options.dryRun ? 'yes' : 'no'}`);
  console.log(`   Delete source:  ${options.deleteOriginal ? 'yes' : 'no'}\n`);

  try {
    const summary = await transcodeDirectory(adapter, {
      downloadsRoot: options.downloadsRoot,
      sourceDirectories: options.sourceDirectories,
      deleteOriginal: options.deleteOriginal,
      dryRun: options.dryRun,
    });

    for (const result of summary.results) {
      const label =
        result.status === 'failed'
          ? `FAILED (${result.error})`
          : result.status.toUpperCase();
      console.log(formatResultLine(result.inputPath, result.outputPath, label));
    }

    console.log('\n📊 Transcode summary:');
    console.log(`   Scanned:   ${summary.scanned}`);
    console.log(`   Converted: ${summary.converted}`);
    console.log(`   Dry-run:   ${summary.dryRun}`);
    console.log(`   Skipped:   ${summary.skipped}`);
    console.log(`   Failed:    ${summary.failed}`);

    if (summary.failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    if (error instanceof FfmpegNotFoundError) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }

    console.error('❌ Transcode failed:', error);
    process.exit(1);
  }
}

main();
