export type YtdlpFailureKind =
  | 'rate_limit'
  | 'redirect_loop'
  | 'dead_host'
  | 'gone'
  | 'timeout'
  | 'unknown';

export interface ClassifyYtdlpOutputOptions {
  redirectLoop?: boolean;
  timedOut?: boolean;
}

export function classifyYtdlpOutput(
  output: string,
  options: ClassifyYtdlpOutputOptions = {},
): YtdlpFailureKind {
  if (options.redirectLoop) return 'redirect_loop';

  const combined = output.toLowerCase();

  if (combined.includes('429') || combined.includes('too many requests')) {
    return 'rate_limit';
  }

  if (
    combined.includes('410 gone') ||
    combined.includes('http error 410') ||
    combined.includes('http error 404') ||
    combined.includes('404 not found')
  ) {
    return 'gone';
  }

  if (
    combined.includes('failed to resolve') ||
    combined.includes('enotfound') ||
    combined.includes('nodename nor servname')
  ) {
    return 'dead_host';
  }

  if (options.timedOut) return 'timeout';

  return 'unknown';
}

export function isRetryableFailure(kind: YtdlpFailureKind): boolean {
  return kind === 'rate_limit';
}

export function isDirectRedditMediaUrl(url: string): boolean {
  return /i\.redd\.it|v\.redd\.it|preview\.redd\.it|packaged-media\.redd\.it/i.test(url);
}

export function isDeadExternalHost(url: string): boolean {
  return /gfycat\.com/i.test(url);
}
