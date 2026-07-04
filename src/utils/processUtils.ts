export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function waitForProcess(
  pid: number,
  pollMs: number,
  onPoll?: (pid: number) => void,
): Promise<void> {
  while (isProcessRunning(pid)) {
    await sleep(pollMs);
    if (isProcessRunning(pid)) {
      onPoll?.(pid);
    }
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return items.length === 0 ? [] : [items];
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}
