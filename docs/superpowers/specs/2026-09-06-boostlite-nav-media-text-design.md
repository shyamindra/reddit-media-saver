# BoostLite: nav, media playback, users, and text

**Date:** 2026-09-06  
**Status:** approved; implementation plan at `docs/superpowers/plans/2026-09-06-boostlite-nav-media-text.md`  
**App:** `android-app/` (BoostLite)

## Goal

Make browsing feel like a client instead of a prototype: search all of Reddit from a sub, system back returns to home, lists refresh and start at the top, clips autoplay muted in the list and play with sound in fullscreen, `u/name` opens that user’s posts, bodies use Reddit markdown, and comments can show images/gifs.

Ship as **three device installs** in this order: nav → media → people & text.

## Constraints

- Cookie-authenticated `.json` only. No OAuth.
- NSFW never gated (`include_over_18=on`, `raw_json=1`).
- Stay on current Compose screens. Do not add new top-level destinations (no extra bottom tabs). User listings reuse the feed screen via `FeedTarget`.
- No new markdown library. Parse a Reddit subset to `AnnotatedString`.
- JVM unit tests for parser/store/URL/text. UI verified on tablet `HA2C0THQ` after each workstream (`make android-install ADB="adb -s HA2C0THQ"`).
- Never log or commit cookie contents.

## Decisions (locked)

| Topic | Choice |
|---|---|
| Audio | Feed/search/user **muted autoplay**; fullscreen **with sound** |
| User tap | In-app submitted feed (`FeedTarget.User`) |
| Search from a sub | Scope chip: default `r/sub`, toggle to all of Reddit |
| Home | `Starred` if any starred subs, else `r/all` |
| Markdown | Reddit subset, no HTML/tables |
| Comment media | Images and gifs inline; tap opens existing fullscreen viewer |

## Current behavior (what we are changing)

- Search opened from a sub always passes `restrict_sr=on`. There is no way to search globally without leaving the sub first.
- Feed target is not a NavHost route. System back on the feed finishes the activity.
- `FeedViewModel.refresh()` and `isRefreshing` exist but the feed/search lists are not wrapped in pull-to-refresh.
- `rememberLazyListState()` is not keyed on listing identity, so a new sub/sort/search keeps the previous scroll offset.
- Centered cards autoplay only when `media.isGif`. Hosted `v.redd.it` with audio is a still + play icon.
- `VideoPlayer` / `MediaViewer` mute whenever `isGif` is true, including RedGIFs that have a soundtrack.
- CMAF playback uses `rewriteDashHeight`, so `CMAF_720.mp4` at height 1280 becomes `CMAF_1080.mp4` and 404s (poster stays). Live “Kiara Advani” search is full of this shape.
- `u/author` is non-clickable text.
- `LinkedBody` only linkifies markdown links and bare URLs. Bold/italic/code/quotes/lists/headings render as punctuation.
- `RedditComment` is text-only. `flattenComments` ignores `media_metadata`.

---

## Workstream 1 — Nav

### Search scope chip

`BoostNavHost` still opens search with `Routes.search(sub)` only for `FeedTarget.Sub`. Starred / All / User pass `null`.

On the search screen, when opened with a sub:

- Keep `originSub` (the sub from the route) for the life of that search session.
- `restrictSub` is the live restrict: `originSub` or `null`.
- A chip in the sort row: selected `r/{originSub}` vs `Reddit`. Toggling sets `restrictSub` and re-submits if a query is already loaded.
- The text field label follows restrict (`r/{sub}` vs `Reddit`).
- Subreddit typeahead stays global-only and is hidden while `restrictSub != null` (same as today).

When opened without a sub, do not show the chip. Posts are global.

### Back to home

`FeedTargetStore` keeps an in-memory back stack of targets (not persisted). Persisted last-target stays the current `Starred` / `All` / `Sub` / `User` encoding.

**Home:** `Starred` if `starredNames` is non-empty, else `All`.

- `openSub` / `openUser` **push** the previous target if it differs.
- `openStarred` / `openAll` are home jumps: set target and **clear** the stack.
- `fun canGoBack(): Boolean` — stack is non-empty **or** current target is not home.
- `fun goBack(): Boolean` — pop stack if present; else jump to home; return false only when already home (caller finishes the activity).

`FeedScreen` registers `BackHandler(enabled = canGoBack()) { goBack() }`. Search, settings, post, and media overlay keep their existing pops.

`[deleted]` and blank authors are not clickable and do not push.

### Pull to refresh

Wrap the success list on **feed** and **search** with Material3 `PullToRefreshBox`.

- Pull calls `refresh()`, not `load()`. Keep the current items visible; use `isRefreshing` for the indicator.
- Failed refresh while items exist: keep items, do not replace the screen with `ErrorState` (same as today’s `loadMore` error policy).
- Empty/error/loading screens do not use pull-to-refresh.

Search: add `refresh()` that re-runs the last submitted query without a full-screen spinner.

### List starts at top

Key `rememberLazyListState` on listing identity:

- Feed: `target` + `sort` + `time`
- Search: `query` + `restrictSub` + `sort` + `time`

After a **reset** fetch succeeds (`load` or `refresh`), `scrollToItem(0)`. `loadMore` must not reset scroll. Centered autoplay is unchanged: at offset 0 the first card is centered.

---

## Workstream 2 — Media

### Playback policy

`PostMedia` gains `hasAudio: Boolean` (default false).

| Surface | When `videoUrl` is set |
|---|---|
| Centered feed / search / user card | Autoplay, `muted = true`, no controller. Tap opens fullscreen. No play-overlay icon. |
| Non-centered card | Poster only (same as today). |
| Post comments OP | Unchanged split: looping clips (`isGif`) autoplay muted; `hasAudio` stays poster + play → fullscreen. |
| Fullscreen `MediaViewer` | Autoplay, `muted = false`. Controller when `hasAudio`; looping silent clips hide the controller and keep `REPEAT_MODE_ONE`. |

`isGif` still means “looping clip” (RedGIFs, gifv, reddit `is_gif`). It no longer implies mute in fullscreen.

### Parser: CMAF

In `videoMedia`, if `fallback_url` contains `CMAF_`:

- `videoUrl` = decoded fallback **as declared** (do not run `rewriteDashHeight`).
- `downloadUrl` = same declared CMAF URL.

`rewriteDashHeight` remains for `DASH_{n}` only.

`hasAudio` = `reddit_video.has_audio == true` (or preview equivalent). Reddit `is_gif` with `has_audio` false → `hasAudio = false`.

### Parser: RedGIFs with audio

`embedVideo` order becomes:

1. RedGIFs oembed poster → `https://media.redgifs.com/{PascalCase}.mp4` when that poster exists (even if `reddit_video_preview` exists). `isGif = true`, `hasAudio = true`.
2. Else `reddit_video_preview` (CMAF/DASH rules above). `isGif = true`. `hasAudio` from that object.
3. Else preview `variants.mp4`.

Do not invent PascalCase from the lowercase watch slug.

### Parser: bare `v.redd.it`

If `url` / `url_overridden_by_dest` is `https://v.redd.it/{id}` with no `reddit_video` and no playable preview, set:

- `type = VIDEO`
- `videoUrl = https://v.redd.it/{id}/DASHPlaylist.mpd`
- `previewUrl` from `preview` if any
- `hasAudio = true` (unknown; fullscreen gets a controller)

If ExoPlayer fails, the existing poster fallback stays.

### Feed card

`PostCard` autoplays `post.media.videoUrl` when `autoPlay` is true (not only `isGif`). Always muted in the card. Remove the play-circle overlay; the media box still opens fullscreen on tap.

---

## Workstream 3 — People & text

### User feed

```kotlin
sealed class FeedTarget {
    data object Starred : FeedTarget()
    data object All : FeedTarget()
    data class Sub(val name: String) : FeedTarget()
    data class User(val name: String) : FeedTarget()
}
```

- `RedditUrls.userSubmitted(name, sortPath, time, after)` → `https://www.reddit.com/user/{name}/submitted.json?limit=50&raw_json=1&include_over_18=on&sort={sort}&t={time}` plus `after` when present.
- `RedditRepository.userSubmitted` parses with existing `parseListing`.
- `FeedViewModel` branches: `User` → `userSubmitted`; else current `feed(listingSubreddit())`.
- Title: `u/{name}`. Star icon hidden. Drawer selection: none of Starred / r/all / starred subs.
- `openUser(raw)` strips `u/` / `/u/` / `/user/`. No-op for blank, `[deleted]`.
- Persist encoding: `user:{name}` (same last-target prefs as subs).
- Search from a user feed: global (no scope chip).
- `PostCard` / post header / `CommentItem` author is clickable → `openUser`.

User comments tab, about, and trophies are out of scope.

### Markdown

Replace “links only” with a small Reddit-subset formatter used by `LinkedBody` (selftext + comments).

Supported:

- Links: existing `[label](url)` and bare `http(s)` / `/r/` / `/u/`
- `**bold**`, `*italic*` or `_italic_`, `~~strike~~`
- Inline `` `code` ``
- Line-start `> quote`
- Line-start `#` / `##` / `###` headings
- Line-start `- ` / `* ` / `1. ` lists (markers kept, styled)

Not supported: HTML, tables, spoiler `>! !<`, superscript, nested fences, image markdown (images are workstream 3 comment media, not inline in the text run).

Links remain tappable. `https://` stays in the system browser via `LocalUriHandler`. `/r/{sub}` and `/u/{name}` (and the matching reddit.com URLs) call `openSub` / `openUser` so they stay in-app. Author names on cards remain their own clickable `Text`.

### Comment images and gifs

`RedditComment` gains `media: PostMedia?` (null = text only).

`flattenComments` fills it from:

1. `media_metadata` + `![img]({id})` / gallery-style ids in the body (reuse gallery URL rules: `i.redd.it`, mp4 variant over gif bytes).
2. Else a single bare image/gif URL in the body (`i.redd.it`, `i.imgur.com`, `.gif` / `.jpg` / `.png` / `.webp`), run through the same media helpers as posts.

If several metadata items exist, `type = GALLERY` with `galleryUrls`. One gif/mp4 → `VIDEO` + `isGif = true` as for posts. `![img]({id})` tokens used as media are stripped from `body` so they do not show as leftover markdown.

`CommentItem` renders `media` under the body using a compact `MediaContent` (images static; gifs autoplay muted). Tap calls `onOpenMedia` with a synthetic `RedditPost` (comment id, author, empty title, that media) so the existing `MediaViewer` can show it.

Skip `kind=more`. Deleted comments with empty body and no media stay omitted.

---

## Testing (JVM)

| Surface | Cases |
|---|---|
| `FeedTargetStore` | push sub then `goBack` to home; `openAll` clears stack; already-home `goBack` false; `openUser` normalize; `[deleted]` no-op |
| `RedditUrls` | user submitted path; search with/without `restrict_sr` unchanged |
| `RedditParserMediaTest` | CMAF `720` + height 1280 keeps `CMAF_720`; RedGIFs poster preferred over rvp; bare `v.redd.it` id → DASHPlaylist; `hasAudio` from JSON |
| Comment parser | `media_metadata` image; gif+mp4 variant; text-only unchanged |
| Markdown / `linkify` | bold/italic/strike/code/quote/list; existing link tests still pass |

Compose pull-to-refresh, back, and autoplay are verified on device after each workstream, not in JUnit.

## Error handling

- 401/403 and 429: existing `SessionExpiredException` / `RateLimitedException`.
- Pull refresh failure with items: keep items.
- User feed 404: `ErrorState` with Reddit’s message (or “User not found”).
- Constructed `v.redd.it` DASH 404: poster remains (`VideoPlayer` already restores poster on `onPlayerError`).
- Unknown markdown: leave characters as plain text.

## Out of scope

- Voting, posting, comment “load more”
- User comments/about tabs
- Full CommonMark, HTML, spoiler tags
- Autoplay with sound in the feed
- Play Store / OAuth
- Muxing a separate `DASH_audio.mp4` for old v.redd.it (CMAF progressive and RedGIFs mp4 are the audio path)

## Rollout

1. Workstream 1 → unit tests → install tablet → check search chip, back-to-home, pull, new sub starts at top.
2. Workstream 2 → unit tests → install → search `Kiara Advani`: centered clips autoplay muted, fullscreen has sound, no stuck posters on CMAF_720.
3. Workstream 3 → unit tests → install → tap `u/name`, markdown on a text post, image/gif in a comment.
