# BoostLite: hidden user posts and comments

**Date:** 2026-09-07  
**Status:** approved; implementation plan at `docs/superpowers/plans/2026-09-07-boostlite-hidden-user-history.md`  
**App:** `android-app/` (BoostLite)

## Goal

Tapping `u/name` shows that user’s **posts and comments** even when Reddit’s profile is set to hide activity. Live Reddit listings stay the first source. When they come back empty, the app fills the same screen from the public [Arctic Shift](https://arctic-shift.photon-reddit.com/) archive (same approach as the profile-unhider extensions).

## Constraints

- Cookie-authenticated Reddit `.json` only for live calls. No OAuth.
- NSFW never gated on live Reddit (`include_over_18=on`, `raw_json=1`).
- Stay on the existing feed screen via `FeedTarget.User`. No new NavHost destination.
- **Never send Reddit cookies** (or the Reddit User-Agent cookie jar) to Arctic Shift. Archive HTTP is a separate unauthenticated client.
- Never log or commit cookie contents.
- JVM unit tests for URLs, JSON mapping, and the live-then-archive decision. UI verified on device after the workstream.
- Do not vendor or wrap a browser extension. Call the archive HTTP API from the app.

## Decisions (locked)

| Topic | Choice |
|---|---|
| Archive | Arctic Shift only for v1 (not PullPush, not dual-merge) |
| When to archive | After a successful Reddit listing that is **empty**, or Reddit returns a profile-hidden error |
| Posts UI | Existing `PostCard` list |
| Comments UI | New profile-comment rows on the same feed screen (Posts / Comments chips) |
| Sort / time | Apply to **live** Reddit listings. Archive pages are always newest-first by `created_utc` |
| Opening a row | Post card → existing post/media flow. Comment row → open the parent permalink in the existing post screen |
| Cookies on archive | None |

## Current behavior

- `openUser` sets `FeedTarget.User` and `FeedViewModel` calls `RedditUrls.userSubmitted` → `/user/{name}/submitted.json`.
- There is no `/user/{name}/comments.json` path and no Posts/Comments switch.
- Hidden profiles therefore render as an empty (or error) feed.

## Architecture

One deep module, small interface:

```
UserHistory
  posts(name, sort, time, after?) → Listing<RedditPost>
  comments(name, after?) → Listing<ProfileComment>
```

Callers (`FeedViewModel`) do not know whether a page came from Reddit or Arctic Shift, except a boolean `fromArchive` on the result so the UI can show a one-line source caption.

**Implementation (hidden):**

1. Live Reddit: existing `userSubmitted`; new `userComments` → `/user/{name}/comments.json` with the same `limit`, `raw_json`, `include_over_18`, `sort`, `t`, `after` query as submitted.
2. If that listing has **zero items**, call Arctic Shift:
   - `GET https://arctic-shift.photon-reddit.com/api/posts/search?author={name}&limit=100&sort=desc`
   - `GET https://arctic-shift.photon-reddit.com/api/comments/search?author={name}&limit=100&sort=desc`
   - Further pages: `before={created_utc of last item}` (unix seconds).
3. Map archive JSON into domain models. Do not pass Arctic Shift blobs into Compose.

`Listing.after` for archive pages is the last item’s `created_utc` as a decimal string (not a Reddit `t3_…` fullname). `UserHistory` owns that encoding so `FeedViewModel` still just passes `after` through.

### `ProfileComment`

Thread `RedditComment` stays nested (`depth`). Profile history is flat:

- `id`, `author`, `body`, `score`, `createdUtc`
- `subreddit`
- `permalink` (comment or parent post; used to open `PostScreen`)

No archive comment media in v1. Body uses existing `LinkedBody`.

### Archive → `RedditPost`

Map `id`, `title`, `author`, `subreddit`, `permalink`, `url`, `selftext`, `score`, `num_comments`, `created_utc`, `over_18`, `domain` into `RedditPost`. Run the same media resolver used for listings **on the mapped fields** (url / selftext / preview if present). Missing `media_metadata` is OK: the card may be a still or link; tapping loads the live permalink for full media.

If the live post is gone, the post screen shows its existing error; the list still showed the archive title/body.

## UI

On `FeedTarget.User` only, under the `u/{name}` title:

- Chips: **Posts** (default) and **Comments**.
- Switching chips reloads that list (keyed list state, same as target/sort today).
- If `fromArchive`, a single caption: `From archive (profile hidden)`.
- Sort and time menus stay. They affect live Reddit. When the page is from archive they have no effect (do not hide them in v1).
- Pull-to-refresh and load-more keep working.

Comment rows: author (already this user), `r/sub` tappable, relative time, body. Tap row → `onOpenPost(permalink)`.

## Errors

| Situation | UI |
|---|---|
| Reddit session expired | Existing cookie error (do not fall through to archive as a substitute for auth) |
| Reddit empty, archive has items | Archive list + caption |
| Reddit empty, archive empty | Empty state: `No posts` / `No comments` |
| Reddit empty, archive 429 / down | Error: `Archive unavailable. Try again.` |
| Archive item with no permalink | Skip the row |

Rate-limit Arctic Shift independently of Reddit. Do not retry in a tight loop.

## Out of scope

- PullPush dual-merge
- Restoring `[deleted]` / `[removed]` bodies **inside a thread** (Reveddit-style)
- About, trophies, karma charts
- Sending Reddit cookies to any third party
- Prefetching every archive page
- Changing non-user feeds

## Testing

- `RedditUrls.userComments` shape (mirror `userSubmitted` tests).
- Arctic Shift URL builder: `author`, `limit=100`, `sort=desc`, optional `before`.
- Mapper: sample post/comment JSON → `RedditPost` / `ProfileComment`.
- `UserHistory` decision: non-empty Reddit → no archive call; empty Reddit → archive called; 401/403 Reddit → no archive call.
- Fake HTTP for both clients; never hit the network in JVM tests.

## Risks

- Archive lag: very new posts may be missing until Arctic Shift indexes them. Live Reddit is preferred when it returns items.
- Deleted media: list can show a title whose permalink 404s.
- Third-party uptime and rate limits are outside our control. Fail visibly.
- Arctic Shift fields can drift; keep mapping in one file.

## Sources (research)

- [Arctic Shift](https://github.com/ArthurHeitmann/arctic_shift) / [API](https://github.com/ArthurHeitmann/arctic_shift/tree/master/api)
- [souravas/reddit-profile-unhider](https://github.com/souravas/reddit-profile-unhider)
- [Mahmut-Dursun-Can/reddit-profile-unhider](https://github.com/Mahmut-Dursun-Can/reddit-profile-unhider)
- [sidbfz/unhider-for-reddit](https://github.com/sidbfz/unhider-for-reddit)
- [PullPush](https://www.pullpush.io/) (not used in v1)
