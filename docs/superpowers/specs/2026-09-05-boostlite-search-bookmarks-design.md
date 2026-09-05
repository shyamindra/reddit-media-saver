# BoostLite: subreddit search, scoped search, and starred homes

**Date:** 2026-09-05  
**Status:** implementation in progress  
**App:** `android-app/` (BoostLite)

## Goal

Before device testing, make discovery usable: search communities as well as posts, search inside the sub you are currently reading, and keep a local starred-sub home with Hot/New (and Top/Rising) of those subs plus a list to open one at a time.

## Constraints (from existing product)

- Cookie-authenticated `.json` only. No OAuth, no Reddit account subscribe/unsubscribe.
- NSFW never gated (`include_over_18=on`).
- Stay on the current Kotlin/Compose screens; do not add Home/Bookmarks/Search as separate top-level destinations.
- Local persistence matches `CookieStore`: SharedPreferences, no encryption for this prototype.

## Current behavior (what we are changing)

- Feed is always a single sub string, default `all`. Title tap opens a “Go to subreddit” dialog.
- Search is posts only (`type=link`). Restrict chips exist only if you opened search from a sub other than `all`; from `r/all` there is no scoped search.
- `RedditParser.parseListing` skips anything that is not `kind=t3`, so community listings cannot be parsed today.

## Feed target

Replace the feed’s single `subreddit: String` with an explicit target so the title is never `r/cats+pics+aww`.

```kotlin
sealed class FeedTarget {
    data object Starred : FeedTarget()
    data object All : FeedTarget()
    data class Subreddit(val name: String) : FeedTarget()
}
```

| Target | Title | Listing path | Search scope default |
|---|---|---|---|
| `Starred` (one or more stars) | `Starred` | `/r/{name1}+{name2}+…/{sort}.json` | global |
| `Starred` (zero stars) | `r/all` (target becomes `All`) | `/r/all/{sort}.json` | global |
| `All` | `r/all` | `/r/all/{sort}.json` | global |
| `Subreddit("cats")` | `r/cats` | `/r/cats/{sort}.json` | scoped to `cats` |

Startup: if `BookmarkStore` is non-empty, target is `Starred`; otherwise `All`. Removing the last star while on `Starred` switches to `All` and reloads.

## BookmarkStore

Deep module: callers only add/remove/list/toggle/isStarred and observe names. Persistence is an implementation detail.

**Interface (callers and tests):**

- `val names: StateFlow<List<String>>` — unique, insertion order, no `r/` prefix.
- `fun isStarred(name: String): Boolean`
- `fun add(name: String): Boolean` — true if added. Normalizes (`trim`, strip `r/` / `/r/`). Uniqueness is case-insensitive; keep the first spelling added. No-op if empty, `all`, `frontpage`, or already present. Returns false if at cap.
- `fun remove(name: String)`
- `fun toggle(name: String): Boolean` — true if starred after the call.
- `fun joinedForFeed(): String?` — `name1+name2+…` of at most `MAX_STARRED` names, or null if empty.

**Cap:** `MAX_STARRED = 20`. Combined Reddit listing URLs get long; “a few” subs is the product. At cap, `add` returns false; UI toasts “Starred limit reached”.

**Persistence:** SharedPreferences set/string, same process as `CookieStore`. Default empty.

**Not in this module:** network, feed fetching, UI.

## Search

One box, one submit. Two Reddit calls in parallel; UI concatenates:

1. **Communities** — `/search.json?q={q}&type=sr&include_over_18=on&limit=10&raw_json=1`
2. **Posts** — existing `/search.json?q={q}&type=link&…` (and `/r/{sub}/search.json?…&restrict_sr=on` when scoped)

**Scope (posts only):**

- Opened from `FeedTarget.Subreddit(name)`: chips `r/{name}` (selected) and `All of Reddit`. Default `restrict_sr=on`.
- Opened from `Starred` or `All`: no chips; posts are global. Do not pass a fake combined `sub1+sub2` as `restrict_sr`.
- Community results are **always global**, including when posts are scoped, so you can still find other subs.

Tapping a community row sets `FeedTarget.Subreddit(name)` and pops search. A star on the row calls `BookmarkStore.toggle` and stays on search.

If one of the two calls fails and the other succeeds, show the successful section and omit the empty/failed one (no full-screen error). Full-screen `ErrorState` only if both fail (session/rate-limit/other as today).

Empty query: do not submit (same as today).

## Bookmarks list (title sheet)

Replaces the current “Go to subreddit” dialog.

Opened by tapping the feed title. Contains:

1. **Starred** row — select `FeedTarget.Starred` (disabled/hidden when zero stars).
2. **r/all** row — select `FeedTarget.All`.
3. Starred sub names — tap opens `FeedTarget.Subreddit`; trailing star removes.
4. **Go to subreddit** field + Go — same normalization as today, then `FeedTarget.Subreddit`.

Feed title bar: when target is `Subreddit`, a star icon toggles that name in `BookmarkStore`. Hidden on `Starred` and `All`.

## Reddit JSON and parsing

Existing `RedditClient` (Cookie + desktop UA) unchanged.

New `Subreddit` model: `name` (`display_name`), `title`, `subscribers`, `over18`, `publicDescription` (`public_description`).

`RedditParser.parseSubredditListing(json)`: walk `data.children`, keep `kind=t5` only, skip malformed rows. `Listing<Subreddit>` with `after` ignored for v1 (no community pagination).

`RedditRepository.searchSubreddits(query)` builds the `type=sr` URL. Post search URL builder stays as today, including `restrict_sr=on` when `subreddit` is non-null.

`RedditRepository.feed` already accepts a sub string; FeedViewModel passes `joinedForFeed()` or `all` or the single name. No change to sort query params.

## UI pieces

- `SubredditRow` — name, subscriber count, optional blurb, star, click.
- Search `LazyColumn`: community rows, divider, post cards (existing `PostCard`).
- Feed: title text from `FeedTarget`; star action; bookmarks sheet.

`BoostNavHost` search route still takes an optional `sub` query param. Feed passes `name` only for `FeedTarget.Subreddit`; otherwise `null`.

## Testing (JVM, `android-app/app/src/test`)

Add JUnit to the app module. No emulator required for this feature.

| Surface | Cases |
|---|---|
| Bookmark names / store logic | normalize `r/Cats` → `Cats`; ignore `all`; toggle; cap 20; `joinedForFeed` order and `+`; empty → null |
| `parseSubredditListing` | fixture with mixed `t5`/`t3`; empty children; missing data |
| Repository URLs | `type=sr`; post search with and without `restrict_sr=on` (fake `RedditClient` that records the URL) |

Compose screens are verified on emulator/device after implementation, not in this test set.

## Out of scope

- Reddit gold/mod multis, folders, remote sync of subscriptions
- Community search pagination
- Muxing v.redd.it audio, Play Store, OAuth, voting
- Changing cookie import

## Error handling

- 401/403 → existing `SessionExpiredException` / “Sign-in needed”
- 429 → existing rate-limit message
- Star at cap → toast, no crash
- Invalid go-to name (blank) → ignore
- Combined feed HTTP error → same `ErrorState` as a normal sub feed
