import { runFixCorrupt } from './fixCorrupt';
import { runOrganize } from './organize';
import { runRecoverHtml } from './recoverHtml';

export type RepairOperation = 'fix-corrupt' | 'recover-html';

export interface RepairCommand {
  operation: RepairOperation;
  dryRun?: boolean;
}

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
  }
}

export { runOrganize, runFixCorrupt, runRecoverHtml };
