import { runTranscodeGifs } from '../repair/transcodeGifs';

async function main(): Promise<void> {
  const { parseCli } = await import('../cli/parseCli');
  const { executeCli } = await import('../cli/executeCli');

  const command = parseCli(['repair', 'transcode-gifs', ...process.argv.slice(2)]);
  await executeCli(command);
}

main().catch((error) => {
  console.error('❌ Transcode failed:', error);
  process.exit(1);
});

export { runTranscodeGifs as transcodeGifs };
