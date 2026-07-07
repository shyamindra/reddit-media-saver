import { resetAppConfigForTests } from '../config/appConfig';
import {
  resetDeadSubredditRegistryForTests,
  shouldSkipDeadSubredditUrl,
  shouldSkipSubreddit,
} from './deadSubreddits';

describe('deadSubreddits', () => {
  beforeEach(() => {
    resetAppConfigForTests();
    resetDeadSubredditRegistryForTests();
  });

  afterAll(() => {
    resetAppConfigForTests();
    resetDeadSubredditRegistryForTests();
  });
  it('skips HotWebScene, ilovelesbians, and NostalgiaFapping case-insensitively', () => {
    expect(shouldSkipSubreddit('HotWebScene')).toBe(true);
    expect(shouldSkipSubreddit('ilovelesbians')).toBe(true);
    expect(shouldSkipSubreddit('NostalgiaFapping')).toBe(true);
    expect(shouldSkipSubreddit('TreasureChestCelebs')).toBe(true);
    expect(shouldSkipSubreddit('TurkishCeleb')).toBe(true);
    expect(shouldSkipSubreddit('Actress_and_stuff')).toBe(true);
    expect(shouldSkipSubreddit('u_natagomez92')).toBe(true);
    expect(shouldSkipSubreddit('Celebs')).toBe(false);
  });

  it('skips URLs from dead subreddits', () => {
    expect(
      shouldSkipDeadSubredditUrl(
        'https://www.reddit.com/r/HotWebScene/comments/abc123/title/',
      ),
    ).toBe(true);
    expect(
      shouldSkipDeadSubredditUrl(
        'https://www.reddit.com/r/ilovelesbians/comments/abc123/title/',
      ),
    ).toBe(true);
    expect(
      shouldSkipDeadSubredditUrl(
        'https://www.reddit.com/r/Celebs/comments/abc123/title/',
      ),
    ).toBe(false);
  });
});
