# Handoff: BoostLite install + cookie extraction

**Date:** 2026-07-27  
**Updated:** 2026-09-08 — CLI build/install is `make android-build` / `make android-install`. The Gradle wrapper jar is committed. See [`android-app/README.md`](../../android-app/README.md).

**Repo:** `/Users/sid/projects/reddit-media-saver`  
**Next focus:** Get the Android prototype installed on a device/emulator and prove cookie export → import → authenticated browse.

---

## Goal for the next session

1. Build and install **BoostLite** (`android-app/`).
2. Export Firefox Reddit cookies with **Make** (optional ADB push).
3. Import cookies in-app and confirm feed/search/post works.

Do **not** rebuild the app architecture unless install/cookie flow is blocked.

---

## What already exists (reference, don’t re-litigate)

| Artifact | Path |
|---|---|
| Android app (Kotlin + Jetpack Compose, not RN) | `android-app/` |
| Install + cookie docs | `android-app/README.md` |
| Cookie export Make targets | `Makefile` (`android-cookie`, `android-cookie-push`, `android-build`, `android-install`) |
| Export CLI | `src/scripts/exportAndroidCookie.ts` |
| Export logic + filter | `src/services/exportAndroidCookies.ts` |
| Unit tests (passing) | `src/services/exportAndroidCookies.test.ts` |
| npm script | `package.json` → `export-android-cookie` |
| In-app import UI | `android-app/.../ui/screens/settings/SettingsScreen.kt` |
| Cookie parse/store | `android-app/.../data/CookieParser.kt`, `CookieStore.kt` |
| Feasibility prototype (TUI, earlier) | `src/prototypes/androidCookieBrowse/` |
| Desktop cookie export (same yt-dlp path) | `src/services/browserSessionService.ts` |

**Product intent (settled):** personal reader/downloader; no on-device Reddit login UI; import Firefox cookies; feeds/subs/comments/search/download; no ads/NSFW gating; no voting/inbox. Cookie refresh by re-export when session dies is acceptable.

**Consensus:** Feasible via Netscape cookie import. Auto-reading Android browser cookies / desktop-site mode does **not** work (sandbox). Anonymous `.json` is dead.

---

## Environment (historical, 2026-07-27)

At the time of this handoff the machine had no CLI JDK, no `ANDROID_HOME`, and no wrapper jar. **As of 2026-09** the wrapper jar is committed and CLI builds use `JAVA_HOME=/opt/homebrew/opt/openjdk@17` with `make android-build` / `make android-install`. `adb` remains at `/opt/homebrew/bin/adb`.

---

## Cookie extraction (do this)

**Prereq:** Log in to reddit.com in **desktop Firefox**; enable NSFW in Reddit prefs; **fully quit Firefox** before export (yt-dlp cannot read the profile while open).

```bash
cd /Users/sid/projects/reddit-media-saver

# Export reddit.com-only Netscape file
make android-cookie
# → ~/Downloads/boostlite-reddit-cookies.txt

# Optional: USB debugging + unlocked device
make android-cookie-push
# → /sdcard/Download/boostlite-reddit-cookies.txt
```

Overrides: `BROWSER=firefox`, `ANDROID_COOKIE_OUT=/path`, `ADB=adb`, `ANDROID_COOKIE_DEVICE=/sdcard/Download/...`

Equivalent: `npm run export-android-cookie -- --out ~/Downloads/boostlite-reddit-cookies.txt`

**Never commit** cookie files. Repo already gitignores `*reddit*cookies*.txt` and session cookie paths.

**Security:** Treat the export as a session secret. Do not paste cookie contents into chat/logs/issues.

In BoostLite: **Settings (gear) → Import file** → pick `boostlite-reddit-cookies.txt`. On 401/403, re-run `make android-cookie` and import again.

---

## App installation (do this)

From the repo root (JDK 17 + `adb`):

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@17 make android-install
# or a specific device: ADB="adb -s SERIAL"
```

Or open **Android Studio** on folder `android-app/` (not repo root) and run `app` (minSdk 26). Then import cookies (above) → open feed → open a post → try search → Save once.

---

## Smoke checklist

- [ ] `make android-cookie` writes a non-empty Netscape file with reddit.com rows
- [ ] (optional) `adb devices` shows device; `make android-cookie-push` succeeds
- [ ] `JAVA_HOME=/opt/homebrew/opt/openjdk@17 make android-build` produces `android-app/app/build/outputs/apk/debug/app-debug.apk`
- [ ] `adb devices` shows device; `make android-install` succeeds
- [ ] Settings shows “Session active” after import
- [ ] Feed loads without 403
- [ ] Post + comments load
- [ ] Search returns results
- [ ] Download enqueue works for an image/video URL

---

## Suggested skills

- **verification-before-completion** — before claiming install/export “works”, run the smoke checklist and capture command output (redact cookie values).
- **systematic-debugging** — if export fails (Firefox open / yt-dlp / empty cookies) or Gradle sync/build fails.
- **using-superpowers** — only if starting a broader session; this handoff is already scoped.
- **brainstorming** / **writing-plans** — only if the user pivots to new product work after install works; not needed for install+cookie.

Avoid rewriting the Kotlin app or re-running the feasibility TUI unless install/cookie is unblocked and the user asks for features.

---

## Out of scope for next session (unless asked)

- React Native rewrite (current stack is Kotlin/Compose).
- Voting, inbox, OAuth.
- Muxing separate v.redd.it audio into downloads.
- Publishing to Play Store.
