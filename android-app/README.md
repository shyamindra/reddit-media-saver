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

- Starred subs, r/all, one subreddit, or `u/name` (last target restored)
- Feeds (`hot` / `new` / `top` / `rising`) with infinite scroll and pull-to-refresh
- Post detail: title, media, **selftext under media**, flattened comment threads
- Comment images, GIFs, and Giphy embeds next to remaining caption text
- User Posts / Comments chips; hidden profiles fall back to Arctic Shift (no Reddit cookies on archive)
- Search — current sub or all of Reddit; time filters
- Media: images, GIFs, galleries, Reddit/RedGIFs/CMAF video (muted autoplay in feed, sound fullscreen)
- One-tap **Save** to `Downloads/BoostLite` (system DownloadManager)
- Cookie import via pasted string or `cookies.txt` file; session status screen
- NSFW never filtered (`include_over_18=on`, `over_18` ignored)

## Requirements

- **JDK 17** for CLI builds (`brew install openjdk@17`). Android Studio also works and bundles a JDK.
- A physical device or emulator on **Android 8.0 (API 26)** or newer. `adb` for install (`brew install android-platform-tools`).

The Gradle wrapper (`android-app/gradle/wrapper/`) is committed. CLI builds use `./gradlew` from `android-app/`.

## Build and install

From the **repo root**:

```bash
# Debug APK only (no device required)
JAVA_HOME=/opt/homebrew/opt/openjdk@17 make android-build

# Build and install on the connected device/emulator
JAVA_HOME=/opt/homebrew/opt/openjdk@17 make android-install

# Specific device when several are attached
JAVA_HOME=/opt/homebrew/opt/openjdk@17 make android-install ADB="adb -s SERIAL"
```

Then BoostLite → **Settings (gear)** → **Import file** (cookies below).

### Android Studio

1. **Open** → select the `android-app/` folder (not the repo root).
2. Sync Gradle, then run the `app` configuration on your device/emulator.

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
  FeedTargetStore   Starred / all / sub / user + last target
  RedditClient      OkHttp; injects Cookie + desktop UA; maps 401/403/429
  ArchiveClient     unauthenticated GET for Arctic Shift (no cookies)
  UserHistory       live user listing, then archive if empty
  RedditParser      org.json → domain models + media resolution
  RedditRepository  builds Reddit .json endpoints, off-main-thread
download/
  MediaDownloader   system DownloadManager → Downloads/BoostLite
ui/
  screens/{feed,post,search,settings} + components + Compose theme
BoostLiteApp        service locator + Coil ImageLoader (cookies for previews)
```

Build from the **repo root** with `make android-build` / `make android-install` (see above). Do not send Reddit cookies to Arctic Shift.

## Known limitations (prototype)

- **v.redd.it Save**: the downloaded file may omit the separate audio track
  (muxing needs ffmpeg — follow-up). In-app playback uses DASH/CMAF (has audio).
- Comments are flattened with an indent bar; no collapse/load-more ("more" stubs
  are skipped).
- Feed cards show title + media only; full `selftext` is on the post screen.
- Hidden-profile archive is newest-first; sort/time apply to live Reddit only.
  Archive comment rows have no inline media in v1.
- No voting, inbox, or account actions (out of scope by design).
- Cookies stored in plain SharedPreferences — swap to EncryptedSharedPreferences
  before any real use.
