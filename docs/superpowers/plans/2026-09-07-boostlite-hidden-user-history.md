# BoostLite Hidden User History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `u/name`, show Posts and Comments even when Reddit hides the profile, using live `.json` first and Arctic Shift only when that listing is empty.

**Architecture:** A `UserHistory` module hides the live-then-archive choice. `FeedViewModel` calls `posts` / `comments` and only reads `HistoryPage.fromArchive` for a caption. Archive HTTP is a separate OkHttp client with no Reddit cookies. Mapping Arctic Shift JSON into `RedditPost` / `ProfileComment` stays in one parser file.

**Tech Stack:** Kotlin, Jetpack Compose, OkHttp, org.json, JUnit 4 JVM tests, existing Reddit `.json` + Arctic Shift HTTP.

## Global Constraints

- Cookie-authenticated Reddit `.json` only. No OAuth.
- NSFW never gated on live Reddit (`include_over_18=on`, `raw_json=1`).
- Stay on the existing feed screen via `FeedTarget.User`. No new NavHost destination.
- Never send Reddit cookies or the cookie-jar User-Agent client to Arctic Shift.
- Never log or commit cookie contents.
- JVM tests: `cd android-app && JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}" ./gradlew :app:testDebugUnitTest --tests <class>`
- Device: `JAVA_HOME=/opt/homebrew/opt/openjdk@17 make android-install ADB="adb -s 34011FDH3001VX"` from repo root.
- Spec: `docs/superpowers/specs/2026-09-07-boostlite-hidden-user-history-design.md`

## File map

| File | Responsibility |
|---|---|
| `android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt` | `ProfileComment`, `HistoryPage`, `UserHistoryTab` |
| `android-app/app/src/main/java/com/boostlite/reddit/data/RedditUrls.kt` | `userComments` |
| `android-app/app/src/test/java/com/boostlite/reddit/data/RedditUrlsTest.kt` | `userComments` URL |
| `android-app/app/src/main/java/com/boostlite/reddit/data/ArcticShiftUrls.kt` | Archive search URLs |
| `android-app/app/src/test/java/com/boostlite/reddit/data/ArcticShiftUrlsTest.kt` | Archive URL tests |
| `android-app/app/src/main/java/com/boostlite/reddit/data/ArcticShiftParser.kt` | Archive JSON → domain |
| `android-app/app/src/test/java/com/boostlite/reddit/data/ArcticShiftParserTest.kt` | Mapper tests |
| `android-app/app/src/main/java/com/boostlite/reddit/data/RedditParser.kt` | `parseCommentListing` for live `/comments.json` |
| `android-app/app/src/test/java/com/boostlite/reddit/data/RedditParserCommentListingTest.kt` | Live comment listing |
| `android-app/app/src/main/java/com/boostlite/reddit/data/ArchiveClient.kt` | Unauthenticated GET JSON |
| `android-app/app/src/main/java/com/boostlite/reddit/data/RedditRepository.kt` | `userComments` |
| `android-app/app/src/main/java/com/boostlite/reddit/data/UserHistory.kt` | Live-then-archive |
| `android-app/app/src/test/java/com/boostlite/reddit/data/UserHistoryTest.kt` | Decision tests with fakes |
| `android-app/app/src/main/java/com/boostlite/reddit/BoostLiteApp.kt` | Construct `ArchiveClient` + `UserHistory` |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedViewModel.kt` | User tab + history fetch |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedScreen.kt` | Posts/Comments chips, caption, comment rows |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/components/ProfileCommentRow.kt` | Flat comment row |

---

### Task 1: URL builders

**Files:**
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/RedditUrls.kt`
- Modify: `android-app/app/src/test/java/com/boostlite/reddit/data/RedditUrlsTest.kt`
- Create: `android-app/app/src/main/java/com/boostlite/reddit/data/ArcticShiftUrls.kt`
- Create: `android-app/app/src/test/java/com/boostlite/reddit/data/ArcticShiftUrlsTest.kt`

**Produces:**
- `RedditUrls.userComments(name, sortPath, time, after?)` → `/user/{name}/comments.json?...`
- `ArcticShiftUrls.posts(author, beforeUtc?)` and `comments(author, beforeUtc?)`

- [ ] **Step 1: Write failing tests**

Append to `RedditUrlsTest.kt`:

```kotlin
    @Test
    fun userComments_pathAndNsfw() {
        val url = RedditUrls.userComments("spez", sortPath = "hot", time = "all")
        assertTrue(url.startsWith("https://www.reddit.com/user/spez/comments.json?"))
        assertTrue(url.contains("sort=hot"))
        assertTrue(url.contains("t=all"))
        assertTrue(url.contains("include_over_18=on"))
        assertTrue(url.contains("raw_json=1"))
        assertTrue(url.contains("limit=50"))
    }
```

Create `ArcticShiftUrlsTest.kt`:

```kotlin
package com.boostlite.reddit.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ArcticShiftUrlsTest {
    @Test
    fun posts_authorLimitSort() {
        val url = ArcticShiftUrls.posts("spez")
        assertTrue(url.startsWith("https://arctic-shift.photon-reddit.com/api/posts/search?"))
        assertTrue(url.contains("author=spez"))
        assertTrue(url.contains("limit=100"))
        assertTrue(url.contains("sort=desc"))
        assertFalse(url.contains("before="))
    }

    @Test
    fun comments_includesBefore() {
        val url = ArcticShiftUrls.comments("spez", beforeUtc = 1700000000L)
        assertTrue(url.startsWith("https://arctic-shift.photon-reddit.com/api/comments/search?"))
        assertTrue(url.contains("author=spez"))
        assertTrue(url.contains("before=1700000000"))
    }
}
```

- [ ] **Step 2: Run tests — expect fail (unresolved `userComments` / `ArcticShiftUrls`)**

```bash
cd android-app && JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}" ./gradlew :app:testDebugUnitTest --tests com.boostlite.reddit.data.RedditUrlsTest --tests com.boostlite.reddit.data.ArcticShiftUrlsTest
```

- [ ] **Step 3: Implement URLs**

Add to `RedditUrls.kt` (same query string as `userSubmitted`, path `comments.json`):

```kotlin
    fun userComments(
        name: String,
        sortPath: String,
        time: String = "all",
        after: String? = null,
    ): String {
        val user = URLEncoder.encode(name.trim(), "UTF-8")
        return buildString {
            append(BASE).append("/user/").append(user).append("/comments.json")
            append("?limit=50&raw_json=1&include_over_18=on")
            append("&sort=").append(sortPath)
            append("&t=").append(time)
            if (!after.isNullOrEmpty()) append("&after=").append(after)
        }
    }
```

Create `ArcticShiftUrls.kt`:

```kotlin
package com.boostlite.reddit.data

import java.net.URLEncoder

object ArcticShiftUrls {
    const val BASE = "https://arctic-shift.photon-reddit.com"

    fun posts(author: String, beforeUtc: Long? = null): String =
        search("/api/posts/search", author, beforeUtc)

    fun comments(author: String, beforeUtc: Long? = null): String =
        search("/api/comments/search", author, beforeUtc)

    private fun search(path: String, author: String, beforeUtc: Long?): String {
        val name = URLEncoder.encode(author.trim(), "UTF-8")
        return buildString {
            append(BASE).append(path)
            append("?author=").append(name)
            append("&limit=100&sort=desc")
            if (beforeUtc != null) append("&before=").append(beforeUtc)
        }
    }
}
```

- [ ] **Step 4: Re-run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/data/RedditUrls.kt \
  android-app/app/src/test/java/com/boostlite/reddit/data/RedditUrlsTest.kt \
  android-app/app/src/main/java/com/boostlite/reddit/data/ArcticShiftUrls.kt \
  android-app/app/src/test/java/com/boostlite/reddit/data/ArcticShiftUrlsTest.kt
git commit -m "$(cat <<'EOF'
feat(boostlite): add user comments and Arctic Shift URL builders

EOF
)"
```

---

### Task 2: Domain types + live comment listing + archive mapper

**Files:**
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/RedditParser.kt`
- Create: `android-app/app/src/test/java/com/boostlite/reddit/data/RedditParserCommentListingTest.kt`
- Create: `android-app/app/src/main/java/com/boostlite/reddit/data/ArcticShiftParser.kt`
- Create: `android-app/app/src/test/java/com/boostlite/reddit/data/ArcticShiftParserTest.kt`

**Produces:**
- `data class ProfileComment(id, author, body, score, createdUtc, subreddit, permalink)`
- `data class HistoryPage<T>(items, after, fromArchive)`
- `enum class UserHistoryTab { POSTS, COMMENTS }`
- `RedditParser.parseCommentListing(json): Listing<ProfileComment>`
- `ArcticShiftParser.parsePosts(json)` / `parseComments(json)` → `Listing` (after = last `created_utc` string, skip rows with blank permalink)

- [ ] **Step 1: Write failing tests**

`RedditParserCommentListingTest.kt`:

```kotlin
package com.boostlite.reddit.data

import org.junit.Assert.assertEquals
import org.junit.Test

class RedditParserCommentListingTest {
    @Test
    fun parsesT1Children() {
        val json = """
            {"kind":"Listing","data":{"after":"t1_abc","children":[
              {"kind":"t1","data":{
                "id":"c1","author":"spez","body":"hello","score":3,
                "created_utc":1700000000,"subreddit":"announcements",
                "permalink":"/r/announcements/comments/xyz/title/c1/"
              }},
              {"kind":"t3","data":{"id":"skip"}}
            ]}}
        """.trimIndent()
        val listing = RedditParser.parseCommentListing(json)
        assertEquals(1, listing.items.size)
        assertEquals("c1", listing.items.single().id)
        assertEquals("hello", listing.items.single().body)
        assertEquals("announcements", listing.items.single().subreddit)
        assertEquals("t1_abc", listing.after)
    }
}
```

`ArcticShiftParserTest.kt`:

```kotlin
package com.boostlite.reddit.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ArcticShiftParserTest {
    @Test
    fun posts_mapAndCursorFromLastCreatedUtc() {
        val json = """
            {"data":[
              {"id":"p1","name":"t3_p1","title":"Hi","author":"spez","subreddit":"pics",
               "permalink":"/r/pics/comments/p1/hi/","url":"https://i.redd.it/x.jpg",
               "score":10,"num_comments":2,"created_utc":111,"over_18":false,"domain":"i.redd.it"},
              {"id":"p2","title":"No link","author":"spez","subreddit":"pics","permalink":""}
            ]}
        """.trimIndent()
        val listing = ArcticShiftParser.parsePosts(json)
        assertEquals(1, listing.items.size)
        assertEquals("p1", listing.items.single().id)
        assertEquals("Hi", listing.items.single().title)
        assertEquals("111", listing.after)
    }

    @Test
    fun comments_skipBlankPermalink() {
        val json = """
            {"data":[
              {"id":"c1","author":"spez","body":"yo","score":1,"created_utc":222,
               "subreddit":"pics","permalink":"/r/pics/comments/p1/hi/c1/"},
              {"id":"c2","author":"spez","body":"nope","permalink":""}
            ]}
        """.trimIndent()
        val listing = ArcticShiftParser.parseComments(json)
        assertEquals(1, listing.items.size)
        assertEquals("c1", listing.items.single().id)
        assertEquals("222", listing.after)
    }

    @Test
    fun comments_buildPermalinkFromLinkId() {
        val json = """
            {"data":[{"id":"c9","author":"a","body":"x","score":0,"created_utc":1,
              "subreddit":"pics","link_id":"t3_abc123"}]}
        """.trimIndent()
        val listing = ArcticShiftParser.parseComments(json)
        assertEquals("/r/pics/comments/abc123/", listing.items.single().permalink)
        assertEquals("1", listing.after)
    }
}
```

- [ ] **Step 2: Run tests — expect compile fail**

```bash
cd android-app && JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}" ./gradlew :app:testDebugUnitTest --tests com.boostlite.reddit.data.RedditParserCommentListingTest --tests com.boostlite.reddit.data.ArcticShiftParserTest
```

- [ ] **Step 3: Implement types and parsers**

Add to `Models.kt`:

```kotlin
data class ProfileComment(
    val id: String,
    val author: String,
    val body: String,
    val score: Int,
    val createdUtc: Long,
    val subreddit: String,
    val permalink: String,
)

data class HistoryPage<T>(
    val items: List<T>,
    val after: String?,
    val fromArchive: Boolean,
)

enum class UserHistoryTab { POSTS, COMMENTS }
```

Add `parseCommentListing` on `RedditParser` (t1 only). Map `body` through `HtmlEntities.decode`. Reuse existing `optStringOrNull`.

`ArcticShiftParser`:
- Read `data` as `JSONArray` (also accept a bare array).
- Posts: wrap each object as `{kind:"t3",data:obj}` listing JSON and call `RedditParser.parseListing`, then set `after` from last kept item's `createdUtc`. Skip items whose permalink is blank after parse.
- Comments: map fields; if permalink blank, if `link_id` is `t3_*` and subreddit non-blank, permalink = `/r/{sub}/comments/{id}/`; else skip.
- `after` = last kept `createdUtc.toString()`; null if empty.

- [ ] **Step 4: Re-run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt \
  android-app/app/src/main/java/com/boostlite/reddit/data/RedditParser.kt \
  android-app/app/src/main/java/com/boostlite/reddit/data/ArcticShiftParser.kt \
  android-app/app/src/test/java/com/boostlite/reddit/data/RedditParserCommentListingTest.kt \
  android-app/app/src/test/java/com/boostlite/reddit/data/ArcticShiftParserTest.kt
git commit -m "$(cat <<'EOF'
feat(boostlite): parse live and Arctic Shift user comment listings

EOF
)"
```

---

### Task 3: ArchiveClient + UserHistory

**Files:**
- Create: `android-app/app/src/main/java/com/boostlite/reddit/data/ArchiveClient.kt`
- Create: `android-app/app/src/main/java/com/boostlite/reddit/data/UserHistory.kt`
- Create: `android-app/app/src/test/java/com/boostlite/reddit/data/UserHistoryTest.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/RedditRepository.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/BoostLiteApp.kt`

**Produces:**
- `ArchiveClient.getJson(url: String): String` — OkHttp **without** Cookie interceptor; 429 → `RateLimitedException("Archive unavailable. Try again.")`; other HTTP → `IOException("Archive unavailable. Try again.")`
- `RedditRepository.userComments(name, sort, time, after?)`
- `class UserHistory(reddit: RedditRepository, archive: ArchiveClient)`
  - `suspend fun posts(name, sort, time, after?): HistoryPage<RedditPost>`
  - `suspend fun comments(name, sort, time, after?): HistoryPage<ProfileComment>`
- Decision: Reddit `SessionExpiredException` propagates (no archive). Empty Reddit items → archive. Non-empty Reddit → `fromArchive=false`, never call archive. Archive `after` is unix seconds: parse `after?.toLongOrNull()` as `beforeUtc`.

For tests, do **not** construct real OkHttp. Give `UserHistory` function types or a small interface:

```kotlin
fun interface JsonGetter {
    fun getJson(url: String): String
}
```

`UserHistory` constructor:

```kotlin
class UserHistory(
    private val livePosts: (name: String, sort: FeedSort, time: String, after: String?) -> Listing<RedditPost>,
    private val liveComments: (name: String, sort: FeedSort, time: String, after: String?) -> Listing<ProfileComment>,
    private val archiveGet: JsonGetter,
)
```

`BoostLiteApp` wires lambdas to `repository` + `ArchiveClient`.

- [ ] **Step 1: Write `UserHistoryTest`**

```kotlin
package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.FeedSort
import com.boostlite.reddit.data.model.Listing
import com.boostlite.reddit.data.model.MediaType
import com.boostlite.reddit.data.model.PostMedia
import com.boostlite.reddit.data.model.ProfileComment
import com.boostlite.reddit.data.model.RedditPost
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class UserHistoryTest {
    private val post = RedditPost(
        id = "p", fullname = "t3_p", title = "T", author = "spez",
        subreddit = "pics", permalink = "/r/pics/comments/p/t/",
        linkUrl = null, score = 1, numComments = 0, createdUtc = 1,
        over18 = false, domain = null, selftext = null,
        media = PostMedia(MediaType.NONE),
    )

    @Test
    fun posts_usesLiveWhenNonEmpty_doesNotHitArchive() {
        var archiveHits = 0
        val h = UserHistory(
            livePosts = { _, _, _, _ -> Listing(listOf(post), "t3_next") },
            liveComments = { _, _, _, _ -> Listing(emptyList(), null) },
            archiveGet = JsonGetter { archiveHits++; "{}" },
        )
        val page = kotlinx.coroutines.runBlocking {
            h.posts("spez", FeedSort.HOT, "all", null)
        }
        assertEquals(listOf(post), page.items)
        assertFalse(page.fromArchive)
        assertEquals("t3_next", page.after)
        assertEquals(0, archiveHits)
    }

    @Test
    fun posts_emptyLive_loadsArchive() {
        val h = UserHistory(
            livePosts = { _, _, _, _ -> Listing(emptyList(), null) },
            liveComments = { _, _, _, _ -> Listing(emptyList(), null) },
            archiveGet = JsonGetter {
                """{"data":[{"id":"p1","title":"Hi","author":"spez","subreddit":"pics",
                    "permalink":"/r/pics/comments/p1/hi/","url":"https://i.redd.it/x.jpg",
                    "score":1,"num_comments":0,"created_utc":111,"over_18":false}]}"""
            },
        )
        val page = kotlinx.coroutines.runBlocking {
            h.posts("spez", FeedSort.HOT, "all", null)
        }
        assertTrue(page.fromArchive)
        assertEquals("p1", page.items.single().id)
        assertEquals("111", page.after)
    }

    @Test
    fun posts_sessionExpired_doesNotHitArchive() {
        var archiveHits = 0
        val h = UserHistory(
            livePosts = { _, _, _, _ -> throw SessionExpiredException("expired") },
            liveComments = { _, _, _, _ -> Listing(emptyList(), null) },
            archiveGet = JsonGetter { archiveHits++; "{}" },
        )
        try {
            kotlinx.coroutines.runBlocking { h.posts("spez", FeedSort.HOT, "all", null) }
            fail("expected SessionExpiredException")
        } catch (_: SessionExpiredException) {}
        assertEquals(0, archiveHits)
    }
}
```

Need `runBlocking`: add `testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")` only if not already present; `kotlinx-coroutines-core` on the app already allows `runBlocking` from tests if the dependency is on the classpath. Prefer `kotlinx.coroutines.runBlocking` from `kotlinx-coroutines-android` / core already pulled by the app.

- [ ] **Step 2: Run test — expect fail**

- [ ] **Step 3: Implement `ArchiveClient`, `userComments`, `UserHistory`, wire `BoostLiteApp`**

`UserHistory.posts`: try live; on empty, `archiveGet.getJson(ArcticShiftUrls.posts(name, after?.toLongOrNull()))` then `ArcticShiftParser.parsePosts` → `HistoryPage(..., fromArchive=true)`. Same for comments.

- [ ] **Step 4: Re-run `UserHistoryTest` — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/data/ArchiveClient.kt \
  android-app/app/src/main/java/com/boostlite/reddit/data/UserHistory.kt \
  android-app/app/src/test/java/com/boostlite/reddit/data/UserHistoryTest.kt \
  android-app/app/src/main/java/com/boostlite/reddit/data/RedditRepository.kt \
  android-app/app/src/main/java/com/boostlite/reddit/BoostLiteApp.kt
git commit -m "$(cat <<'EOF'
feat(boostlite): fall back to Arctic Shift when a user listing is empty

EOF
)"
```

---

### Task 4: Feed UI — Posts / Comments chips

**Files:**
- Create: `android-app/app/src/main/java/com/boostlite/reddit/ui/components/ProfileCommentRow.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedViewModel.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedScreen.kt`

**Produces:**
- `UserHistoryTab` on the view model; `setTab` reloads
- `fromArchive: StateFlow<Boolean>`
- `commentState: StateFlow<UiState<List<ProfileComment>>>` (or a sealed feed body)
- Chips only when `FeedTarget.User`
- Caption `From archive (profile hidden)` when `fromArchive`
- Empty success: `No posts` / `No comments`
- Comment row tap → `onOpenPost(permalink)`
- `listKey` includes tab
- Load-more uses `page.after`
- Archive 429 / IO → `UiState.Error("Archive unavailable. Try again.")`

Keep subreddit/all feeds on the existing post `state` path (no `UserHistory`).

- [ ] **Step 1:** No Compose UI test harness. Cover view-model tab reset with a JVM test only if a fake `UserHistory` is easy to inject; otherwise verify by device after install. Do **not** skip `UserHistory` unit tests from Task 3.

- [ ] **Step 2: Implement `ProfileCommentRow`**

Row: `r/{sub}` clickable, `u/{author}` (not a new navigation if already that user), relative time, `LinkedBody` for `body`. Whole row clickable → `onClick`.

- [ ] **Step 3: Wire `FeedViewModel` + `FeedScreen`**

When target is `User` and tab is `POSTS`, `userHistory.posts(...)`. When `COMMENTS`, `userHistory.comments(...)`. Reset tab to `POSTS` when `FeedTarget` changes away from that user (or whenever target changes).

- [ ] **Step 4: Run all BoostLite unit tests**

```bash
cd android-app && JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}" ./gradlew :app:testDebugUnitTest
```

Expected: BUILD SUCCESSFUL, 0 failed tests.

- [ ] **Step 5: Install on Pixel**

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@17 make android-install ADB="adb -s 34011FDH3001VX"
```

- [ ] **Step 6: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/ui/components/ProfileCommentRow.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedViewModel.kt \
  android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedScreen.kt
git commit -m "$(cat <<'EOF'
feat(boostlite): show archived posts and comments on hidden user profiles

EOF
)"
```

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| Live submitted then Arctic Shift posts | 3 |
| Live comments.json then Arctic Shift comments | 1, 2, 3 |
| No cookies on archive | 3 `ArchiveClient` |
| Session expired does not archive | 3 |
| Posts / Comments chips on `FeedTarget.User` | 4 |
| Caption from archive | 4 |
| Skip blank permalink | 2 |
| Empty states | 4 |
| Archive 429 copy | 3, 4 |
| Open comment → post screen | 4 |
| Sort/time on live only | 3 (archive ignores sort, always desc) |
| No PullPush / no thread undelete | out of scope |

## Placeholder scan

None: URLs, types, decision table, and UI copy are specified.
