import { runFixCorrupt } from './fixCorrupt';
import { runOrganize } from './organize';
import { runRecoverHtml } from './recoverHtml';
import { runTranscodeGifs, type RunTranscodeGifsOptions } from './transcodeGifs';

export type RepairOperation = 'fix-corrupt' | 'recover-html' | 'transcode-gifs';

export type RepairCommand =
  | { operation: 'fix-corrupt' }
  | { operation: 'recover-html' }
  | { operation: 'transcode-gifs'; transcodeOptions?: RunTranscodeGifsOptions };

export interface RepairCommandResult {
  operation: RepairOperation;
  summary: unknown;
}

export async function executeRepairCommand(command: RepairCommand): Promise<RepairCommandResult> {
  switch (command.operation) {
    case 'fix-corrupt': {
      const summary = runFixCorrupt();
      return { operation: command.operation, summary };
    }
    case 'recover-html': {
      const summary = await runRecoverHtml();
      return { operation: command.operation, summary };
    }
    case 'transcode-gifs': {
      const summary = await runTranscodeGifs(command.transcodeOptions);
      return { operation: command.operation, summary };
    }
  }
}

export { runOrganize, runFixCorrupt, runRecoverHtml, runTranscodeGifs };
