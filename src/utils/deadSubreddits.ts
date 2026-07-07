/**
 * Dead subreddit skip list — loaded from file-backed registry (see batch maintenance module).
 * Bootstrap list used when registry file is missing or empty.
 * Regenerate registry with: npx tsx src/cli.ts batch analyze-dead
 */
import { loadAppConfig } from '../config/appConfig';
import {
  loadDeadSubredditRegistryWithFallback,
  shouldSkipSubredditInRegistry,
} from '../batchMaintenance/deadSubredditRegistry';

export const DEAD_SUBREDDITS = new Set([
  '60fpsvintageporn',
  'actress_and_stuff',
  'agatha_vegaxxx',
  'agegapcelebkiss',
  'alasjuicy',
  'animaltrainer',
  'armpitfantasy',
  'badgirlspunished',
  'beautifulindianwomen',
  'benboyleseviyorum',
  'bestporningalaxy',
  'birthdaysoftheday',
  'blacktapeproject',
  'bouncefuck',
  'casual_random',
  'celebnipvisibility',
  'celebscenes',
  'celebhub',
  'celebswithbigtits',
  'chinesebsexy',
  'cumoverdose',
  'cutetitties',
  'desiactresses',
  'desibeautifulthighs',
  'desinavelandwaist',
  'divine_women',
  'dovi_nsfwclips',
  'fashionshowvideosgw',
  'fearlessbeautygw',
  'girlsgoingcrazy',
  'gropensuckcelebboobs',
  'gravure',
  'harleylove',
  'home_watch',
  'hot_actress_india',
  'hot_blondescelebs',
  'hotbikinicelebs',
  'hotwebscene',
  'ilovelesbians',
  'katdenningshot',
  'latest_celebs',
  'lasirena69',
  'lesbianmax',
  'nostalgiafapping',
  'nudecams',
  'officialcelebhub',
  'onoffcelebs',
  'onlycleavageclub',
  'paulinagaitan',
  'pinaysinporn',
  'pornstarhq',
  'pornstars_soles',
  'premiumhardcore',
  's4evault',
  'skaterskirts_nsfw',
  'softcorenights',
  'southindianbeauty',
  'southindianspice',
  'telugu_kamakompa',
  'thiccukbrits',
  'thericonsfw',
  'tiffanygrey',
  'toosexylesbiangifs',
  'treasurechestcelebs',
  'turkish_celeb',
  'turkishceleb',
  'u_natagomez92',
  'upscaledvintageporn',
  'wetfingerbabes',
  'whoisshensfw',
  'wildmodels',
]);

let cachedRegistry: Set<string> | undefined;

/** @internal test helper */
export function resetDeadSubredditRegistryCache(): void {
  cachedRegistry = undefined;
}

/** @deprecated use resetDeadSubredditRegistryCache */
export const resetDeadSubredditRegistryForTests = resetDeadSubredditRegistryCache;

function getDeadSubredditNames(): Set<string> {
  if (!cachedRegistry) {
    const config = loadAppConfig();
    cachedRegistry = loadDeadSubredditRegistryWithFallback(
      config.paths.deadSubredditsFile,
      DEAD_SUBREDDITS,
    );
  }
  return cachedRegistry;
}

export function extractSubredditFromUrl(url: string): string | null {
  const match = url.match(/\/r\/([^/]+)\//i);
  return match?.[1] ?? null;
}

export function shouldSkipSubreddit(subreddit: string): boolean {
  return shouldSkipSubredditInRegistry(subreddit, getDeadSubredditNames());
}

export function shouldSkipDeadSubredditUrl(url: string): boolean {
  const subreddit = extractSubredditFromUrl(url);
  return subreddit !== null && shouldSkipSubreddit(subreddit);
}
