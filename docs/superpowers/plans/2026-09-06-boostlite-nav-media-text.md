# BoostLite Nav / Media / Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship BoostLite nav (search chip, back-to-home, pull-to-refresh, scroll reset), media (muted list autoplay, fullscreen sound, CMAF/RedGIFs/bare v.redd.it), then user feeds, markdown, and comment images/gifs.

**Architecture:** Keep current Compose screens. `FeedTargetStore` owns an in-memory target stack. `RedditParser` stays the media seam (`hasAudio`, CMAF as-declared, RedGIFs source mp4). New `FeedTarget.User` reuses `FeedScreen`. Markdown is a pure `formatRedditText` module feeding `LinkedBody`. Comment `media_metadata` reuses post media helpers.

**Tech Stack:** Kotlin, Jetpack Compose, Material3 `PullToRefreshBox`, Media3 ExoPlayer, Reddit `.json` via existing `RedditClient`, JUnit 4 JVM tests.

## Global Constraints

- Cookie-authenticated `.json` only. No OAuth.
- NSFW never gated (`include_over_18=on`, `raw_json=1`).
- Stay on current Compose screens. No new top-level destinations.
- No new markdown library.
- JVM tests: `cd android-app && JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}" ./gradlew :app:testDebugUnitTest`
- Device: `make android-install ADB="adb -s HA2C0THQ"` from repo root.
- Never log or commit cookie contents.
- Spec: `docs/superpowers/specs/2026-09-06-boostlite-nav-media-text-design.md`

## File map

| File | Responsibility |
|---|---|
| `android-app/app/src/main/java/com/boostlite/reddit/data/FeedTargetStore.kt` | Target stack, `goBack`/`canGoBack`, later `openUser` |
| `android-app/app/src/test/java/com/boostlite/reddit/data/FeedTargetStoreTest.kt` | Stack + user normalize tests |
| `android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt` | `FeedTarget.User`, `PostMedia.hasAudio`, `RedditComment.media` |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedViewModel.kt` | `goBack`, `isRefreshing`, user listing branch |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedScreen.kt` | `BackHandler`, pull-to-refresh, keyed list, author clicks, user title |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/search/SearchViewModel.kt` | `originSub`, restrict toggle, `refresh`/`isRefreshing` |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/search/SearchScreen.kt` | Scope chips, pull-to-refresh, keyed list |
| `android-app/app/src/main/java/com/boostlite/reddit/data/RedditParser.kt` | CMAF as-declared, RedGIFs first, bare v.redd.it, `hasAudio`, comment media |
| `android-app/app/src/test/java/com/boostlite/reddit/data/RedditParserMediaTest.kt` | CMAF/RedGIFs/bare v.redd.it/`hasAudio` |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/components/PostCard.kt` | Autoplay any `videoUrl` muted; author click |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/media/MediaViewer.kt` | Fullscreen unmuted; controller iff `hasAudio` |
| `android-app/app/src/main/java/com/boostlite/reddit/data/RedditUrls.kt` | `userSubmitted` |
| `android-app/app/src/test/java/com/boostlite/reddit/data/RedditUrlsTest.kt` | User submitted URL |
| `android-app/app/src/main/java/com/boostlite/reddit/data/RedditRepository.kt` | `userSubmitted` |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/text/RedditMarkdown.kt` | Reddit-subset formatter |
| `android-app/app/src/test/java/com/boostlite/reddit/ui/text/RedditMarkdownTest.kt` | Formatter tests |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/components/LinkedBody.kt` | Render spans; in-app `/r/` `/u/` |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/components/CommentItem.kt` | Author click + comment media |
| `android-app/app/src/test/java/com/boostlite/reddit/data/RedditParserCommentMediaTest.kt` | Comment `media_metadata` |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/post/PostScreen.kt` | Author click, `LinkedBody` callbacks, comment media open |

---

## Workstream 1 — Nav

### Task 1: FeedTargetStore back stack

**Files:**
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/FeedTargetStore.kt`
- Modify: `android-app/app/src/test/java/com/boostlite/reddit/data/FeedTargetStoreTest.kt`

**Produces:**
- `fun home(): FeedTarget`
- `fun canGoBack(): Boolean`
- `fun goBack(): Boolean` — true if target changed
- `openSub` pushes previous target; `openStarred`/`openAll` clear the stack

- [ ] **Step 1: Write failing tests** (append to `FeedTargetStoreTest.kt`)

```kotlin
    @Test
    fun goBack_fromSub_returnsHome() {
        val ft = store("pics")
        assertEquals(FeedTarget.Starred, ft.target.value)
        ft.openSub("cats")
        assertEquals(FeedTarget.Sub("cats"), ft.target.value)
        assertTrue(ft.canGoBack())
        assertTrue(ft.goBack())
        assertEquals(FeedTarget.Starred, ft.target.value)
        assertFalse(ft.canGoBack())
        assertFalse(ft.goBack())
    }

    @Test
    fun goBack_popsThroughSubsThenHome() {
        val ft = store("pics")
        ft.openSub("a")
        ft.openSub("b")
        assertTrue(ft.goBack())
        assertEquals(FeedTarget.Sub("a"), ft.target.value)
        assertTrue(ft.goBack())
        assertEquals(FeedTarget.Starred, ft.target.value)
    }

    @Test
    fun openAll_clearsStack() {
        val ft = store("pics")
        ft.openSub("cats")
        ft.openAll()
        assertEquals(FeedTarget.All, ft.target.value)
        assertFalse(ft.canGoBack())
    }

    @Test
    fun goBack_subWithNoStarred_goesToAll() {
        val ft = store()
        ft.openSub("cats")
        assertTrue(ft.goBack())
        assertEquals(FeedTarget.All, ft.target.value)
        assertFalse(ft.canGoBack())
    }
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd android-app && JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}" ./gradlew :app:testDebugUnitTest --tests com.boostlite.reddit.data.FeedTargetStoreTest
```

Expected: FAIL (unresolved `canGoBack` / `goBack`).

- [ ] **Step 3: Implement stack in `FeedTargetStore`**

Add `private val stack = ArrayDeque<FeedTarget>()`.

```kotlin
    fun home(): FeedTarget = if (joined() != null) FeedTarget.Starred else FeedTarget.All

    fun canGoBack(): Boolean = stack.isNotEmpty() || _target.value != home()

    fun goBack(): Boolean {
        if (stack.isNotEmpty()) {
            _target.value = stack.removeLast()
            persistTarget()
            return true
        }
        if (_target.value != home()) {
            _target.value = home()
            persistTarget()
            return true
        }
        return false
    }

    private fun pushAndSet(next: FeedTarget) {
        val cur = _target.value
        if (cur == next) return
        stack.addLast(cur)
        _target.value = next
        persistTarget()
    }

    private fun jumpHome(next: FeedTarget) {
        stack.clear()
        _target.value = next
        persistTarget()
    }
```

Change `openStarred` to `jumpHome(if (joined() != null) FeedTarget.Starred else FeedTarget.All)`.  
Change `openAll` to `jumpHome(FeedTarget.All)`.  
Change `openSub` (after all-alias / normalize) to `pushAndSet(FeedTarget.Sub(name))`.  
`openSub("r/all")` still calls `openAll()` (clears stack).

- [ ] **Step 4: Re-run `FeedTargetStoreTest` — all PASS**

- [ ] **Step 5: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/data/FeedTargetStore.kt \
  android-app/app/src/test/java/com/boostlite/reddit/data/FeedTargetStoreTest.kt
git commit -m "$(cat <<'EOF'
fix(boostlite): pop feed target on back instead of leaving the app

EOF
)"
```

---

### Task 2: Wire feed BackHandler + pull-to-refresh + scroll reset

**Files:**
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedViewModel.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedScreen.kt`

**Consumes:** `FeedTargetStore.canGoBack`, `goBack`, existing `refresh()` / `isRefreshing`  
**Produces:** System back pops feed target; pull refreshes in place; new listing starts at top

- [ ] **Step 1: Expose back on the view model**

In `FeedViewModel`:

```kotlin
    fun canGoBack(): Boolean = feedTarget.canGoBack()
    fun goBack(): Boolean = feedTarget.goBack()
```

Keep `refresh()` as-is (sets `_isRefreshing`, `fetch(reset = true)` without replacing success with `Loading`). Change `fetch` so a refresh failure with `loaded.isNotEmpty()` does **not** set `ErrorState` (already true for non-reset errors; ensure `reset && loaded.isNotEmpty()` after a failed refresh also keeps `Success`).

In `fetch` catch blocks, only set `ErrorState` when `loaded.isEmpty()`.

- [ ] **Step 2: FeedScreen BackHandler, pull, keyed list**

Imports:

```kotlin
import androidx.activity.compose.BackHandler
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
```

Inside `FeedScreen` after collecting state:

```kotlin
    val isRefreshing by viewModel.isRefreshing.collectAsStateWithLifecycle()
    BackHandler(enabled = viewModel.canGoBack()) { viewModel.goBack() }
```

Replace `val listState = rememberLazyListState()` with:

```kotlin
    val listKey = "${target}|${sort.path}|${time.path}"
    val listState = remember(listKey) { androidx.compose.foundation.lazy.LazyListState() }
```

Wrap the **Success** `LazyColumn` only:

```kotlin
                        PullToRefreshBox(
                            isRefreshing = isRefreshing,
                            onRefresh = { viewModel.refresh() },
                            modifier = Modifier.fillMaxSize(),
                        ) {
                            LazyColumn(
                                state = listState,
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(bottom = 24.dp),
                            ) {
                                // existing items unchanged
                            }
                        }
```

`@OptIn(ExperimentalMaterial3Api::class)` is already on the screen.

Do not wrap Loading/Error in pull-to-refresh.

- [ ] **Step 3: Unit tests still pass**

```bash
cd android-app && JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}" ./gradlew :app:testDebugUnitTest
```

Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedViewModel.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedScreen.kt
git commit -m "$(cat <<'EOF'
fix(boostlite): refresh feed in place and reset scroll on new listings

EOF
)"
```

---

### Task 3: Search scope chip + pull-to-refresh + scroll reset

**Files:**
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/search/SearchViewModel.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/search/SearchScreen.kt`

**Produces:**
- `val originSub: StateFlow<String?>`
- `fun setOriginSub(sub: String?)`
- `fun setRestrictToOrigin(restrict: Boolean)`
- `val isRefreshing: StateFlow<Boolean>`
- `fun refresh()`

- [ ] **Step 1: SearchViewModel origin + refresh**

Replace `setRestrictSub` with:

```kotlin
    private val _originSub = MutableStateFlow<String?>(null)
    val originSub: StateFlow<String?> = _originSub.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    fun setOriginSub(sub: String?) {
        _originSub.value = sub
        _restrictSub.value = sub
        if (sub != null) _suggestions.value = emptyList()
    }

    fun setRestrictToOrigin(restrict: Boolean) {
        val origin = _originSub.value
        _restrictSub.value = if (restrict) origin else null
        if (_restrictSub.value != null) _suggestions.value = emptyList()
        resubmitIfNeeded()
    }

    fun refresh() {
        val q = _query.value.trim()
        if (q.isEmpty() || _state.value !is UiState.Success) {
            submit()
            return
        }
        _isRefreshing.value = true
        viewModelScope.launch {
            try {
                val posts = repo.search(
                    q,
                    subreddit = _restrictSub.value,
                    sort = _sort.value.path,
                    time = _time.value.path,
                ).items
                _state.value = UiState.Success(posts)
            } catch (e: SessionExpiredException) {
                if (_state.value !is UiState.Success) {
                    _state.value = UiState.Error(e.message ?: "Session expired", needsCookies = true)
                }
            } catch (e: RateLimitedException) {
                if (_state.value !is UiState.Success) {
                    _state.value = UiState.Error(e.message ?: "Rate limited")
                }
            } catch (e: Exception) {
                if (_state.value !is UiState.Success) {
                    _state.value = UiState.Error(e.message ?: "Search failed")
                }
            } finally {
                _isRefreshing.value = false
            }
        }
    }
```

Keep `submit()` setting `UiState.Loading` for first search. In `submit()` `finally` is not needed; add `_isRefreshing.value = false` only in `refresh`.

Change `SearchScreen` `LaunchedEffect(restrictSubreddit) { viewModel.setRestrictSub(restrictSubreddit) }` to `setOriginSub`.

- [ ] **Step 2: SearchScreen chips + pull + keyed list**

Collect `originSub` and `isRefreshing`. After the sort chips `Row`, if `originSub != null`:

```kotlin
                    FilterChip(
                        selected = restrictSub != null,
                        onClick = { viewModel.setRestrictToOrigin(true) },
                        label = { Text("r/$originSub") },
                    )
                    FilterChip(
                        selected = restrictSub == null,
                        onClick = { viewModel.setRestrictToOrigin(false) },
                        label = { Text("Reddit") },
                    )
```

`restrictSub` is already collected as `viewModel.restrictSub`. Put these chips **before** the `SearchSort` chips (still in the same scrolling row).

Field label already uses `restrictSubreddit` from the route — change it to the live restrict:

```kotlin
label = { Text(if (restrictSub != null) "r/$restrictSub" else "Reddit") }
```

Need `val restrictSub by viewModel.restrictSub.collectAsStateWithLifecycle()`.

Keyed list + pull on Success posts (same pattern as feed). Suggestions list does not use pull-to-refresh.

```kotlin
    val listKey = "${query}|${restrictSub}|${sort.path}|${time.path}"
    val listState = remember(listKey) { androidx.compose.foundation.lazy.LazyListState() }
```

- [ ] **Step 3: Unit tests pass** (`./gradlew :app:testDebugUnitTest`)

- [ ] **Step 4: Install and verify workstream 1**

```bash
cd /Users/sid/projects/reddit-media-saver
JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}" make android-install ADB="adb -s HA2C0THQ"
```

On device: open a sub → search → chip `Reddit` runs global results → chip `r/sub` scopes again; pull feed to refresh; open a sub, system back returns to Starred/`r/all`; open a new sub, list starts at the first post.

- [ ] **Step 5: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/ui/screens/search/SearchViewModel.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/screens/search/SearchScreen.kt
git commit -m "$(cat <<'EOF'
feat(boostlite): search all of Reddit from a sub via a scope chip

EOF
)"
```

---

## Workstream 2 — Media

### Task 4: Parser CMAF as-declared, hasAudio, RedGIFs over rvp, bare v.redd.it

**Files:**
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/RedditParser.kt`
- Modify: `android-app/app/src/test/java/com/boostlite/reddit/data/RedditParserMediaTest.kt`

**Produces:** `PostMedia.hasAudio: Boolean = false`; CMAF `videoUrl` is the declared fallback; RedGIFs poster mp4 wins over rvp; `https://v.redd.it/{id}` without `reddit_video` → `DASHPlaylist.mpd`

- [ ] **Step 1: Add `hasAudio` to `PostMedia`** (default `false` so existing call sites compile)

```kotlin
    /** True when the stream is expected to have a soundtrack (fullscreen unmutes). */
    val hasAudio: Boolean = false,
```

Update the `isGif` kdoc to: `Looping clip (RedGIFs, gifv, reddit is_gif). Mute is a UI policy, not this flag.`

- [ ] **Step 2: Write failing parser tests** (append)

```kotlin
    @Test
    fun cmaf_keepsDeclaredHeightEvenWhenPostIsTaller() {
        val media = post(
            """
            {
              "id":"c2","name":"t3_c2","title":"V","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/c2/x/",
              "media":{"reddit_video":{
                "is_gif":false,"has_audio":true,"height":1280,
                "fallback_url":"https://v.redd.it/abc/CMAF_720.mp4?source=fallback",
                "dash_url":"https://v.redd.it/abc/DASHPlaylist.mpd?a=1"
              }}
            }
            """.trimIndent(),
        ).media
        assertEquals("https://v.redd.it/abc/CMAF_720.mp4?source=fallback", media.videoUrl)
        assertEquals("https://v.redd.it/abc/CMAF_720.mp4?source=fallback", media.downloadUrl)
        assertTrue(media.hasAudio)
        assertTrue(!media.isGif)
    }

    @Test
    fun redgifs_prefersOembedMp4OverRedditVideoPreview() {
        val media = post(
            """
            {
              "id":"rg4","name":"t3_rg4","title":"G","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/rg4/x/","post_hint":"rich:video","domain":"redgifs.com",
              "url":"https://www.redgifs.com/watch/mildlopsidedkoalabear",
              "preview":{"reddit_video_preview":{
                "is_gif":true,"has_audio":false,"height":480,
                "fallback_url":"https://v.redd.it/x/CMAF_480.mp4"
              }},
              "media":{"oembed":{"thumbnail_url":"https://media.redgifs.com/MildLopsidedKoalabear-poster.jpg"}}
            }
            """.trimIndent(),
        ).media
        assertEquals("https://media.redgifs.com/MildLopsidedKoalabear.mp4", media.videoUrl)
        assertTrue(media.isGif)
        assertTrue(media.hasAudio)
    }

    @Test
    fun bareVreddit_withoutRedditVideo_usesDashPlaylist() {
        val media = post(
            """
            {
              "id":"bv","name":"t3_bv","title":"V","author":"a","subreddit":"pics",
              "permalink":"/r/pics/comments/bv/x/","post_hint":"link","domain":"v.redd.it",
              "url":"https://v.redd.it/29oabq5r9cch1",
              "preview":{"images":[{"source":{"url":"https://external-preview.redd.it/x.jpg","width":640,"height":360}}]}
            }
            """.trimIndent(),
        ).media
        assertEquals(MediaType.VIDEO, media.type)
        assertEquals("https://v.redd.it/29oabq5r9cch1/DASHPlaylist.mpd", media.videoUrl)
        assertTrue(media.hasAudio)
    }
```

Also set `hasAudio` expectations on existing reddit_video tests that include `has_audio` only if you add the field to those fixtures; otherwise they stay `false`.

- [ ] **Step 3: Run tests — expect FAIL** (CMAF_1080 rewrite; rvp still wins; LINK type for bare v.redd.it)

```bash
cd android-app && JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}" ./gradlew :app:testDebugUnitTest --tests com.boostlite.reddit.data.RedditParserMediaTest
```

- [ ] **Step 4: Implement parser**

`videoMedia`:

```kotlin
        val cmaf = fallback != null && Regex("CMAF_\\d+", RegexOption.IGNORE_CASE).containsMatchIn(fallback)
        val download = if (cmaf) fallback else fallback?.let { rewriteDashHeight(it, height) }
        val stream = when {
            cmaf -> fallback
            dash != null -> dash
            hls != null -> hls
            else -> fallback ?: download
        }
        val gif = isGif || video.optBoolean("is_gif")
        return PostMedia(
            type = MediaType.VIDEO,
            previewUrl = previewImage(data),
            videoUrl = stream,
            downloadUrl = download ?: stream,
            isGif = gif,
            hasAudio = video.optBoolean("has_audio"),
        )
```

`embedVideo`: move the oembed RedGIFs block **above** `reddit_video_preview`. Set `hasAudio = true` on that `PostMedia`.

Bare v.redd.it: after `embedVideo` returns null, before GIF-bytes / rich:video-as-link:

```kotlin
        bareVreddit(url)?.let { id ->
            return PostMedia(
                type = MediaType.VIDEO,
                previewUrl = previewImage(data),
                videoUrl = "https://v.redd.it/$id/DASHPlaylist.mpd",
                downloadUrl = "https://v.redd.it/$id/DASHPlaylist.mpd",
                hasAudio = true,
            )
        }
```

```kotlin
    private fun bareVreddit(url: String?): String? {
        if (url == null) return null
        val path = pathWithoutQuery(url).trimEnd('/')
        val host = hostOf(path).lowercase()
        if (host != "v.redd.it") return null
        val id = path.substringAfterLast('/')
        if (id.isBlank() || '.' in id) return null
        return id
    }
```

- [ ] **Step 5: Tests PASS** (`RedditParserMediaTest` + full `:app:testDebugUnitTest`)

- [ ] **Step 6: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt \
  android-app/app/src/main/java/com/boostlite/reddit/data/RedditParser.kt \
  android-app/app/src/test/java/com/boostlite/reddit/data/RedditParserMediaTest.kt
git commit -m "$(cat <<'EOF'
fix(boostlite): play declared CMAF files and RedGIFs source mp4

EOF
)"
```

---

### Task 5: Feed muted autoplay for all videos; fullscreen with sound

**Files:**
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/components/PostCard.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/media/MediaViewer.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/components/MediaContent.kt` (OP gifs stay muted autoplay; `hasAudio` OP stays poster+play)

- [ ] **Step 1: PostCard autoplay any `videoUrl` when `autoPlay`**

Replace:

```kotlin
        val gifStream = post.media.videoUrl.takeIf { post.media.isGif }
```

with:

```kotlin
        val stream = post.media.videoUrl
```

Use `stream` everywhere `gifStream` was used. Keep `muted = true`, `showController = false`.

Delete the block:

```kotlin
                if (post.media.type == MediaType.VIDEO && !post.media.isGif) {
                    IconButton(onClick = onPlayMedia) { ... }
                }
```

Keep `onPlayMedia` in the signature (callers still pass it) but it is unused in the card; do not remove the param (avoids churn in Feed/Search). Suppress unused with `_ = onPlayMedia` or leave the param for the next task.

- [ ] **Step 2: MediaViewer fullscreen unmuted**

In `FullscreenBody` `VideoPlayer` call:

```kotlin
                    autoPlay = true,
                    muted = false,
                    showController = media.hasAudio,
```

Do not pass `muted = post.media.isGif`.

- [ ] **Step 3: MediaContent OP**

Keep: `isGif && stream != null` → muted autoplay. `hasAudio` / non-gif video → poster + play icon (unchanged).

- [ ] **Step 4: Unit tests pass** (`MediaViewerStoreTest` still compiles)

- [ ] **Step 5: Install and verify workstream 2**

```bash
cd /Users/sid/projects/reddit-media-saver
JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}" make android-install ADB="adb -s HA2C0THQ"
```

Search `Kiara Advani`: centered `v.redd.it` clips autoplay muted (not stuck posters); fullscreen has sound and a controller; RedGIFs fullscreen has sound.

- [ ] **Step 6: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/ui/components/PostCard.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/media/MediaViewer.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/components/MediaContent.kt
git commit -m "$(cat <<'EOF'
feat(boostlite): autoplay clips muted in the feed and with sound fullscreen

EOF
)"
```

---

## Workstream 3 — People & text

### Task 6: User submitted URLs + FeedTarget.User + openUser

**Files:**
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/RedditUrls.kt`
- Modify: `android-app/app/src/test/java/com/boostlite/reddit/data/RedditUrlsTest.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/RedditRepository.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/FeedTargetStore.kt`
- Modify: `android-app/app/src/test/java/com/boostlite/reddit/data/FeedTargetStoreTest.kt`

**Produces:**
- `FeedTarget.User(val name: String)`
- `RedditUrls.userSubmitted(name, sortPath, time, after): String`
- `RedditRepository.userSubmitted(...)`
- `FeedTargetStore.openUser(raw: String)`
- `FeedTargetStore.normalizeUser` (internal)

- [ ] **Step 1: Failing URL + store tests**

```kotlin
    @Test
    fun userSubmitted_pathAndNsfw() {
        val url = RedditUrls.userSubmitted("spez", sortPath = "hot", time = "all")
        assertTrue(url.startsWith("https://www.reddit.com/user/spez/submitted.json?"))
        assertTrue(url.contains("sort=hot"))
        assertTrue(url.contains("t=all"))
        assertTrue(url.contains("include_over_18=on"))
        assertTrue(url.contains("raw_json=1"))
        assertFalse(url.contains("/r/"))
    }
```

```kotlin
    @Test
    fun openUser_stripsPrefixAndPushes() {
        val ft = store("pics")
        ft.openUser("u/spez")
        assertEquals(FeedTarget.User("spez"), ft.target.value)
        assertTrue(ft.goBack())
        assertEquals(FeedTarget.Starred, ft.target.value)
    }

    @Test
    fun openUser_deletedIsNoOp() {
        val ft = store()
        ft.openUser("[deleted]")
        assertEquals(FeedTarget.All, ft.target.value)
    }
```

- [ ] **Step 2: Run — FAIL** (unresolved `userSubmitted` / `User` / `openUser`)

- [ ] **Step 3: Implement**

Add `data class User(val name: String) : FeedTarget()` in `Models.kt`.

`listingSubreddit()` for `User` returns `t.name` only as a display fallback. `FeedViewModel.fetch` **must** `when` on `FeedTarget.User` and call `repo.userSubmitted`. Never pass a user name into `RedditUrls.feed`.

`encodeTarget`: `is FeedTarget.User -> "user:${target.name}"`  
`decodeTarget`: `encoded.startsWith("user:") -> normalizeUser(...)?.let { FeedTarget.User(it) }`

```kotlin
    fun openUser(raw: String) {
        val name = normalizeUser(raw) ?: return
        pushAndSet(FeedTarget.User(name))
    }
```

Companion:

```kotlin
        internal fun normalizeUser(raw: String): String? {
            var s = raw.trim()
            if (s.equals("[deleted]", ignoreCase = true)) return null
            when {
                s.startsWith("/user/", ignoreCase = true) -> s = s.substring(6)
                s.startsWith("user/", ignoreCase = true) -> s = s.substring(5)
                s.startsWith("/u/", ignoreCase = true) -> s = s.substring(3)
                s.startsWith("u/", ignoreCase = true) -> s = s.substring(2)
            }
            s = s.trim().trimStart('/')
            return s.takeIf { it.isNotEmpty() }
        }
```

```kotlin
    fun userSubmitted(
        name: String,
        sortPath: String,
        time: String = "all",
        after: String? = null,
    ): String {
        val user = URLEncoder.encode(name.trim(), "UTF-8")
        return buildString {
            append(BASE).append("/user/").append(user).append("/submitted.json")
            append("?limit=50&raw_json=1&include_over_18=on")
            append("&sort=").append(sortPath)
            append("&t=").append(time)
            if (!after.isNullOrEmpty()) append("&after=").append(after)
        }
    }
```

Repository:

```kotlin
    suspend fun userSubmitted(
        name: String,
        sort: FeedSort,
        time: String = "all",
        after: String? = null,
    ): Listing<RedditPost> = withContext(Dispatchers.IO) {
        val url = RedditUrls.userSubmitted(name, sort.path, time, after)
        RedditParser.parseListing(client.getJson(url))
    }
```

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt \
  android-app/app/src/main/java/com/boostlite/reddit/data/RedditUrls.kt \
  android-app/app/src/test/java/com/boostlite/reddit/data/RedditUrlsTest.kt \
  android-app/app/src/main/java/com/boostlite/reddit/data/RedditRepository.kt \
  android-app/app/src/main/java/com/boostlite/reddit/data/FeedTargetStore.kt \
  android-app/app/src/test/java/com/boostlite/reddit/data/FeedTargetStoreTest.kt
git commit -m "$(cat <<'EOF'
feat(boostlite): add user submitted listings as a feed target

EOF
)"
```

---

### Task 7: Feed UI for users + author clicks

**Files:**
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedViewModel.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedScreen.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/search/SearchScreen.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/post/PostScreen.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/components/PostCard.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/components/CommentItem.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/navigation/BoostNavHost.kt` (search from User stays `null` sub — `searchSubArg` already Sub-only)

**Consumes:** `openUser`, `userSubmitted`  
**Produces:** Tapping `u/name` opens that user’s submitted feed

- [ ] **Step 1: FeedViewModel fetch branch**

```kotlin
    fun openUser(name: String) = feedTarget.openUser(name)
```

In `fetch`:

```kotlin
                val listing = when (val t = feedTarget.target.value) {
                    is FeedTarget.User -> repo.userSubmitted(t.name, _sort.value, time = _time.value.path, after = after)
                    else -> repo.feed(
                        feedTarget.listingSubreddit(),
                        _sort.value,
                        time = _time.value.path,
                        after = after,
                    )
                }
```

`searchSubArg()` remains `(target as? FeedTarget.Sub)?.name` (User → global search).

- [ ] **Step 2: Title + hide star**

`FeedTitle`: `is FeedTarget.User -> Text("u/${target.name}", fontWeight = FontWeight.SemiBold)`

Star icon: `if (target is FeedTarget.Sub)` already — User hidden. Good.

- [ ] **Step 3: PostCard author click**

Add `onAuthorClick: (String) -> Unit`. Wrap the `u/${post.author}` `Text` in `clickable` only when `post.author.isNotBlank() && post.author != "[deleted]"`.

Feed Success `PostCard`: `onAuthorClick = { viewModel.openUser(it) }`  
Search: `onAuthorClick = { viewModel.openSub` is wrong — SearchViewModel needs `openUser` delegated from `feedTarget`:

```kotlin
    fun openUser(name: String) = feedTarget.openUser(name)
```

Search `PostCard`: `onAuthorClick = { viewModel.openUser(it); onBack() }` so the user feed is visible after popping search (same as `openSub` + `onBack`).

PostScreen: make `u/${post.author}` clickable via new `onAuthorClick: (String) -> Unit`. `BoostNavHost` Post composable: `onAuthorClick = { BoostLiteApp.instance.feedTarget.openUser(it); navController.popBackStack() }` so back lands on the user feed that was just pushed… **Wrong:** popping post then `openUser` from the feed underneath is correct if we `openUser` **before** pop, because Feed is still in the back stack and its store updates immediately:

```kotlin
onAuthorClick = { name ->
    BoostLiteApp.instance.feedTarget.openUser(name)
    navController.popBackStack()
}
```

Comment authors: `CommentItem(..., onAuthorClick)` same rule. PostScreen passes through. Do **not** pop — user stays on comments until they back; then feed is already the user. Better UX: pop to feed showing the user. Spec: tap opens user feed. Pop post so the user listing is visible:

Comment tap: `onAuthorClick` from PostScreen uses the same `openUser` + `popBackStack`.

- [ ] **Step 4: Unit tests pass**

- [ ] **Step 5: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedViewModel.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedScreen.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/screens/search/SearchViewModel.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/screens/search/SearchScreen.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/screens/post/PostScreen.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/components/PostCard.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/components/CommentItem.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/navigation/BoostNavHost.kt
git commit -m "$(cat <<'EOF'
feat(boostlite): open a user's submitted posts from u/name

EOF
)"
```

---

### Task 8: Reddit markdown subset

**Files:**
- Create: `android-app/app/src/main/java/com/boostlite/reddit/ui/text/RedditMarkdown.kt`
- Create: `android-app/app/src/test/java/com/boostlite/reddit/ui/text/RedditMarkdownTest.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/text/TextLinks.kt` (keep `linkify`; add `fun redditInApp(url: String): Pair<String, String>?` as `"sub"|"user"` to name)
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/components/LinkedBody.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/post/PostScreen.kt`
- Modify: `android-app/app/src/test/java/com/boostlite/reddit/ui/text/TextLinksTest.kt` (existing tests still pass)

**Produces:**
```kotlin
enum class MdStyle { BOLD, ITALIC, STRIKE, CODE, HEADING, QUOTE, LIST }

data class MdSpan(val start: Int, val end: Int, val style: MdStyle)

data class FormattedRedditText(
    val text: String,
    val spans: List<MdSpan>,
    val links: List<TextLink>,
)

fun formatRedditText(input: String): FormattedRedditText

fun redditInApp(url: String): RedditInApp?

sealed class RedditInApp {
    data class Sub(val name: String) : RedditInApp()
    data class User(val name: String) : RedditInApp()
}
```

- [ ] **Step 1: Failing tests**

```kotlin
package com.boostlite.reddit.ui.text

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RedditMarkdownTest {
    @Test
    fun bold_and_italic_stripMarkers() {
        val f = formatRedditText("say **hi** and *there*")
        assertEquals("say hi and there", f.text)
        assertTrue(f.spans.any { it.style == MdStyle.BOLD && f.text.substring(it.start, it.end) == "hi" })
        assertTrue(f.spans.any { it.style == MdStyle.ITALIC && f.text.substring(it.start, it.end) == "there" })
    }

    @Test
    fun strike_code_quote_heading() {
        val f = formatRedditText("~~x~~ and `y`\n> q\n# H")
        assertTrue(f.text.contains("x") && f.text.contains("y"))
        assertTrue(f.spans.any { it.style == MdStyle.STRIKE })
        assertTrue(f.spans.any { it.style == MdStyle.CODE })
        assertTrue(f.spans.any { it.style == MdStyle.QUOTE })
        assertTrue(f.spans.any { it.style == MdStyle.HEADING })
    }

    @Test
    fun markdownLink_stillWorks() {
        val f = formatRedditText("see [cats](https://example.com/a)")
        assertEquals("see cats", f.text)
        assertEquals("https://example.com/a", f.links.single().url)
    }

    @Test
    fun redditInApp_subAndUser() {
        assertEquals(RedditInApp.Sub("pics"), redditInApp("https://www.reddit.com/r/pics"))
        assertEquals(RedditInApp.User("spez"), redditInApp("https://www.reddit.com/u/spez"))
        assertEquals(RedditInApp.User("spez"), redditInApp("https://www.reddit.com/user/spez"))
        assertEquals(null, redditInApp("https://example.com/x"))
    }
}
```

- [ ] **Step 2: Run — FAIL** (unresolved `formatRedditText`)

- [ ] **Step 3: Implement `formatRedditText`**

Algorithm: first run existing `linkify` so `[label](url)` and bare URLs become `LinkedText`. Then walk `linked.text` with regexes that do not overlap `linked.links` ranges:

- `**([^*]+)**` → BOLD, drop markers
- `(?<!\*)\*([^*]+)\*(?!\*)` and `_([^_]+)_` → ITALIC
- `~~([^~]+)~~` → STRIKE
- `` `([^`]+)` `` → CODE
- line-start `^#{1,3} (.+)$` MULTILINE → HEADING (drop `#` prefix)
- line-start `^> (.+)$` → QUOTE (drop `> `)
- line-start `^[-*] ` and `^\d+\. ` → keep the marker characters in `text`, add `MdStyle.LIST` on that line
- line-start `^> (.+)$` → QUOTE, drop the `> ` prefix
- line-start `^#{1,3} (.+)$` → HEADING, drop the `#` prefix

After `linkify`, run a second rebuild that strips `** * ~~ \` `#` `> ` markers, records `MdSpan`s, and shifts `TextLink` offsets the same way `linkify` shifts display text.

`redditInApp`: parse `reddit.com` / `www.reddit.com` path `/r/{name}`, `/u/{name}`, `/user/{name}` (name is first path segment after that). Ignore query/fragment.

- [ ] **Step 4: LinkedBody uses `formatRedditText`**

Add params:

```kotlin
    onOpenSub: ((String) -> Unit)? = null,
    onOpenUser: ((String) -> Unit)? = null,
```

On URL click: `redditInApp(ann.item)` → `onOpenSub`/`onOpenUser` if non-null, else `uriHandler.openUri`.

Apply `SpanStyle` for BOLD (`FontWeight.Bold`), ITALIC (`FontStyle.Italic`), STRIKE (`TextDecoration.LineThrough`), CODE (`FontFamily.Monospace`), HEADING (`FontWeight.Bold` + slightly larger), QUOTE (`onSurfaceVariant`).

PostScreen `LinkedBody` for selftext: pass `onOpenSub` / `onOpenUser` that call `feedTarget.openSub`/`openUser` then `onBack()` (pop post). Comment `LinkedBody` same.

Feed cards do not render selftext — no change.

Keep existing `TextLinksTest` passing (`linkify` unchanged).

- [ ] **Step 5: Tests PASS**

- [ ] **Step 6: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/ui/text/RedditMarkdown.kt \
  android-app/app/src/test/java/com/boostlite/reddit/ui/text/RedditMarkdownTest.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/text/TextLinks.kt \
  android-app/app/src/test/java/com/boostlite/reddit/ui/text/TextLinksTest.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/components/LinkedBody.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/screens/post/PostScreen.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/components/CommentItem.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/navigation/BoostNavHost.kt
git commit -m "$(cat <<'EOF'
feat(boostlite): render Reddit bold italic code quotes and headings

EOF
)"
```

---

### Task 9: Images and gifs in comments

**Files:**
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt` (`RedditComment.media: PostMedia? = null`)
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/RedditParser.kt` (`flattenComments`)
- Create: `android-app/app/src/test/java/com/boostlite/reddit/data/RedditParserCommentMediaTest.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/components/CommentItem.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/post/PostScreen.kt`

**Produces:** comments with `media_metadata` / `![img](id)` / bare image URLs render media; `![img](id)` stripped from body

- [ ] **Step 1: Failing parser test**

```kotlin
package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.MediaType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RedditParserCommentMediaTest {
    @Test
    fun comment_imgMarkdown_usesIReddit() {
        val json = """
            [
              {"kind":"Listing","data":{"children":[{"kind":"t3","data":{
                "id":"p","name":"t3_p","title":"T","author":"a","subreddit":"pics",
                "permalink":"/r/pics/comments/p/x/","is_self":true,"selftext":"hi"
              }}]}},
              {"kind":"Listing","data":{"children":[{"kind":"t1","data":{
                "id":"c1","author":"b","body":"look ![img](abc123xyz)","created_utc":1,"score":2,
                "media_metadata":{"abc123xyz":{"e":"Image","m":"image/jpg",
                  "s":{"x":100,"y":80,"u":"https://preview.redd.it/abc123xyz.jpg?width=100"}}}
              }}]}}
            ]
        """.trimIndent()
        val c = RedditParser.parsePostWithComments(json).comments.single()
        assertEquals("look", c.body.trim())
        assertEquals(MediaType.IMAGE, c.media!!.type)
        assertEquals("https://i.redd.it/abc123xyz.jpg", c.media!!.previewUrl)
    }

    @Test
    fun textOnly_comment_hasNullMedia() {
        val json = """
            [
              {"kind":"Listing","data":{"children":[{"kind":"t3","data":{
                "id":"p","name":"t3_p","title":"T","author":"a","subreddit":"pics",
                "permalink":"/r/pics/comments/p/x/"
              }}]}},
              {"kind":"Listing","data":{"children":[{"kind":"t1","data":{
                "id":"c1","author":"b","body":"plain","created_utc":1,"score":1
              }}]}}
            ]
        """.trimIndent()
        val c = RedditParser.parsePostWithComments(json).comments.single()
        assertEquals("plain", c.body)
        assertEquals(null, c.media)
    }
}
```

- [ ] **Step 2: Run — FAIL** (`media` unresolved or null)

- [ ] **Step 3: Parse comment media**

`RedditComment.media: PostMedia? = null`.

In `flattenComments`, after decoding body:

```kotlin
            val imgIds = Regex("""!\[img]\(([^)]+)\)""").findAll(body).map { it.groupValues[1] }.toList()
            val media = commentMedia(data, body, imgIds)
            val stripped = imgIds.fold(body) { acc, id -> acc.replace("![img]($id)", "") }.trim()
            if (stripped.isNotEmpty() || media != null) {
                out.add(RedditComment(..., body = stripped.ifEmpty { "" }, media = media))
            }
```

`commentMedia`: if `media_metadata` present, resolve each `imgIds` (or all metadata keys if ids empty) via existing `galleryItemUrl`. One IMAGE/GIF/VIDEO url → that `PostMedia`; several → `GALLERY`. Else if body has a single `https://` image/gif URL (`i.redd.it`, `i.imgur.com`, path ends with jpg/png/webp/gif), reuse `resolveMediaDirect` on a tiny JSONObject with `url` set, or call `bestRedditImageUrl` / sibling mp4.

Do not emit comments that are empty after strip and have no media.

- [ ] **Step 4: CommentItem UI**

```kotlin
fun CommentItem(
    comment: RedditComment,
    onAuthorClick: (String) -> Unit = {},
    onOpenMedia: (PostMedia) -> Unit = {},
)
```

If `comment.media != null`, under `LinkedBody` render `MediaContent` with a synthetic post **or** a small local block: `PostImage` for IMAGE; `VideoPlayer` muted autoplay for `isGif`; gallery pager. Tap → `onOpenMedia(comment.media!!)`.

PostScreen builds synthetic `RedditPost` for the viewer:

```kotlin
fun commentAsPost(post: RedditPost, comment: RedditComment): RedditPost =
    post.copy(
        id = comment.id,
        title = comment.body.take(80).ifBlank { "Comment" },
        author = comment.author,
        media = comment.media ?: post.media,
        selftext = comment.body,
        numComments = 0,
    )
```

`onOpenMedia` from BoostNavHost already takes `RedditPost`. PostScreen: `onOpenMedia(commentAsPost(post, comment), true)`.

- [ ] **Step 5: Tests PASS + full unit suite**

- [ ] **Step 6: Install and verify workstream 3**

```bash
cd /Users/sid/projects/reddit-media-saver
JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}" make android-install ADB="adb -s HA2C0THQ"
```

Tap `u/name` on a card → user listing; back returns; a text post shows bold/italic; a comment with an inline image shows the image.

- [ ] **Step 7: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt \
  android-app/app/src/main/java/com/boostlite/reddit/data/RedditParser.kt \
  android-app/app/src/test/java/com/boostlite/reddit/data/RedditParserCommentMediaTest.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/components/CommentItem.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/screens/post/PostScreen.kt
git commit -m "$(cat <<'EOF'
feat(boostlite): show images and gifs inside comments

EOF
)"
```

---

## Spec coverage

| Spec item | Task |
|---|---|
| Search scope chip | 3 |
| Back to home | 1, 2 |
| Pull to refresh | 2, 3 |
| List starts at top | 2, 3 |
| CMAF as-declared | 4 |
| RedGIFs source mp4 over rvp | 4 |
| Bare v.redd.it | 4 |
| `hasAudio` + muted list / loud fullscreen | 4, 5 |
| User submitted feed | 6, 7 |
| Markdown subset + in-app /r/ /u/ | 8 |
| Comment images/gifs | 9 |

## Notes for the implementer

- `FeedTargetStore.listingSubreddit()` for `User` must not be passed to `RedditUrls.feed`. Always `when (target) { is User -> userSubmitted; else -> feed }`.
- Do not print cookies. Device session stays in `boostlite_session.xml`.
- After each workstream install, if a listing looks cached, pull-to-refresh or leave and re-enter the sub.
