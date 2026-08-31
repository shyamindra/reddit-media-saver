# Handoff: BoostLite install + cookie extraction

**Date:** 2026-07-27  
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
| Cookie export Make targets | `Makefile` (`android-cookie`, `android-cookie-push`) |
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

## Environment blockers (this machine, last checked)

- **No JDK** usable from CLI (`java` stub: “Unable to locate a Java Runtime”).
- **No Android SDK** at `~/Library/Android/sdk`; `ANDROID_HOME` unset.
- **`adb` present** at `/opt/homebrew/bin/adb`.
- **`android-app/gradle/wrapper/`** has only `gradle-wrapper.properties` — **no `gradle-wrapper.jar`**. First open in Android Studio (or `gradle wrapper --gradle-version 8.9` with a real Gradle+JDK) is required.

Prefer **Android Studio** for first build (bundles JDK/SDK/wrapper generation).

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

1. Install/open **Android Studio** (stable).
2. **Open** folder `android-app/` (not repo root).
3. Let Gradle sync; generate wrapper if prompted (`gradle-8.9` per `gradle/wrapper/gradle-wrapper.properties`).
4. Run `app` on emulator or device (minSdk 26).
5. Import cookies (above) → open feed (`r/all` or a known sub) → open a post → try search → Save once.

If compile errors appear, fix the minimum needed to assemble/install — the scaffold was written without a local compile in the prior session.

---

## Smoke checklist

- [ ] `make android-cookie` writes a non-empty Netscape file with reddit.com rows
- [ ] (optional) `adb devices` shows device; `make android-cookie-push` succeeds
- [ ] App installs and launches
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
