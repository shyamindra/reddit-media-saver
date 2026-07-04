import { classifyYtdlpOutput, isRetryableFailure } from './ytdlpFailure';

describe('classifyYtdlpOutput', () => {
  it('classifies redirect loops from the loop detector flag', () => {
    expect(classifyYtdlpOutput('', { redirectLoop: true })).toBe('redirect_loop');
  });

  it('classifies 429 as retryable rate_limit', () => {
    expect(classifyYtdlpOutput('HTTP Error 429: Too Many Requests')).toBe('rate_limit');
    expect(isRetryableFailure('rate_limit')).toBe(true);
  });

  it('classifies dead hosts and gone media as non-retryable', () => {
    expect(
      classifyYtdlpOutput("Failed to resolve 'gfycat.com' ([Errno 8] nodename nor servname provided)"),
    ).toBe('dead_host');
    expect(classifyYtdlpOutput('HTTP Error 410: Gone')).toBe('gone');
    expect(isRetryableFailure('dead_host')).toBe(false);
    expect(isRetryableFailure('gone')).toBe(false);
  });
});

describe('isDirectRedditMediaUrl', () => {
  it('matches direct redd.it hosts only', () => {
    const { isDirectRedditMediaUrl } = require('./ytdlpFailure');
    expect(isDirectRedditMediaUrl('https://i.redd.it/abc.gif')).toBe(true);
    expect(isDirectRedditMediaUrl('https://gfycat.com/foo')).toBe(false);
  });
});
