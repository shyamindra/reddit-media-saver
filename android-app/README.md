# BoostLite — a personal, cookie-authenticated Reddit reader (prototype)

A native Android app (Kotlin + Jetpack Compose) that browses Reddit using
**imported Firefox session cookies** instead of an on-device login or the
official API. Boost-style dark UI, no ads, no NSFW gating.

> **Status: prototype / v0.** Built to prove the cookie-auth approach end to end
> (feed → post + comments → search → media → download). Not a store app.

## Why cookies

Reddit shut down unauthenticated `.json` access (~May 2026); only logged-in /
authenticated requests still work. This app reuses the same trick as the desktop
`reddit-media-saver` tool: send your reddit.com `Cookie` header + a desktop
User-Agent against the `.json` endpoints. You supply the cookies by exporting
them from a browser where you're already logged in.

## Features (v0)

- Subreddit feeds (`hot` / `new` / `top` / `rising`) with infinite scroll
- Post detail with flattened, indented comment threads
- Search — global and restricted to a subreddit
- Media: images, GIFs, galleries (swipe), Reddit video (ExoPlayer)
- One-tap **Save** to `Downloads/BoostLite` (system DownloadManager)
- Cookie import via pasted string or `cookies.txt` file; session status screen
- NSFW never filtered (`include_over_18=on`, `over_18` ignored)

## Requirements

- **Android Studio** (latest stable) — bundles the JDK, Gradle, and Android SDK.
- A physical device or emulator on **Android 8.0 (API 26)** or newer.

This sub-project has **no Gradle wrapper jar committed** (binaries can't be
generated here). See "First build" below — Android Studio creates it on sync.

## First build

1. In Android Studio: **Open** → select the `android-app/` folder (not the repo root).
2. Let it sync. If it complains about a missing Gradle wrapper, either:
   - accept its offer to generate the wrapper, **or**
   - from a terminal with Gradle installed (`brew install gradle`), run inside
     `android-app/`:
     ```bash
     gradle wrapper --gradle-version 8.9
     ./gradlew assembleDebug
     ```
3. Run the `app` configuration on your device/emulator.

## Getting your cookies (easiest)

From the **repo root** (desktop Firefox must be fully closed):

```bash
make android-cookie
# → ~/Downloads/boostlite-reddit-cookies.txt

# Optional: push straight to a USB-connected phone (adb)
make android-cookie-push
# → /sdcard/Download/boostlite-reddit-cookies.txt
```

Then in BoostLite → **Settings (gear)** → **Import file** → pick
`boostlite-reddit-cookies.txt`.

Equivalent npm:

```bash
npm run export-android-cookie
npm run export-android-cookie -- --out ~/Downloads/boostlite-reddit-cookies.txt
```

When the feed shows **"session expired"**, re-run `make android-cookie` (or
`android-cookie-push`) and import again.

### Manual fallback

1. Log in to `reddit.com` in Firefox; enable NSFW in Reddit prefs.
2. Export with a cookie add-on (Netscape `cookies.txt`) or paste a cookie string.
3. BoostLite → Settings → Import file / Import pasted.

## Architecture

```
data/
  CookieParser      parse Netscape cookies.txt OR "k=v; k2=v2" → Cookie header
  CookieStore       persist header (SharedPreferences) + observable state
  RedditClient      OkHttp; injects Cookie + desktop UA; maps 401/403/429
  RedditParser      org.json → domain models + media resolution
  RedditRepository  builds .json endpoints (feed/post/search), off-main-thread
download/
  MediaDownloader   system DownloadManager → Downloads/BoostLite
ui/
  screens/{feed,post,search,settings} + components + Compose theme
BoostLiteApp        service locator + Coil ImageLoader (cookies for previews)
```

## Known limitations (prototype)

- **v.redd.it audio**: video track downloads without the separate audio track
  (muxing needs ffmpeg — follow-up). Playback in-app uses the DASH stream (has audio).
- Comments are flattened with an indent bar; no collapse/load-more ("more" stubs
  are skipped).
- No voting, inbox, or account actions (out of scope by design).
- Cookies stored in plain SharedPreferences — swap to EncryptedSharedPreferences
  before any real use.
- Rich video hosts (redgifs/imgur) resolve to a link + preview, not inline play.
