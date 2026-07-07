import { runFixCorrupt } from './fixCorrupt';
import { runIntegrityScan } from './integrityScan';
import { runOrganize } from './organize';
import { runOrganizeByPattern } from './organizeByPattern';
import { runRecoverHtml } from './recoverHtml';
import { runTranscodeGifs, type RunTranscodeGifsOptions } from './transcodeGifs';

export type RepairOperation =
  | 'fix-corrupt'
  | 'recover-html'
  | 'transcode-gifs'
  | 'organize-by-pattern'
  | 'integrity-scan';

export type RepairCommand =
  | { operation: 'fix-corrupt' }
  | { operation: 'recover-html' }
  | { operation: 'transcode-gifs'; transcodeOptions?: RunTranscodeGifsOptions }
  | { operation: 'organize-by-pattern'; dryRun?: boolean }
  | { operation: 'integrity-scan' };

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
    case 'organize-by-pattern': {
      const summary = runOrganizeByPattern({ dryRun: command.dryRun });
      return { operation: command.operation, summary };
    }
    case 'integrity-scan': {
      const summary = await runIntegrityScan();
      return { operation: command.operation, summary };
    }
  }
}

export { runOrganize, runOrganizeByPattern, runFixCorrupt, runRecoverHtml, runTranscodeGifs, runIntegrityScan };
