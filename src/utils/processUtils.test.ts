import { chunk, sleep } from './processUtils';

describe('processUtils', () => {
  describe('chunk', () => {
    it('splits an array into fixed-size batches', () => {
      expect(chunk(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
    });

    it('returns one batch when size exceeds array length', () => {
      expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
    });

    it('returns empty array for empty input', () => {
      expect(chunk([], 3)).toEqual([]);
    });
  });

  describe('sleep', () => {
    it('resolves after the requested delay', async () => {
      const start = Date.now();
      await sleep(20);
      expect(Date.now() - start).toBeGreaterThanOrEqual(15);
    });
  });
});
