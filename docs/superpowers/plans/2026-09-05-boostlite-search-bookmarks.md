# BoostLite Search + Starred Subs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add community search (stacked above posts), scoped in-sub post search, and a local starred-sub home with a bookmarks list — without new top-level destinations.

**Architecture:** Pure `BookmarkNames` + `RedditUrls` modules behind small interfaces; `BookmarkStore` / `FeedSession` persist and share feed target across Feed and Search; `RedditParser` gains `t5` parsing; existing Feed and Search screens absorb the UI.

**Tech Stack:** Kotlin, Jetpack Compose, SharedPreferences, Reddit `.json` via existing `RedditClient`, JUnit 4 unit tests on the JVM (`./gradlew :app:testDebugUnitTest`).

## Global Constraints

- Cookie-authenticated `.json` only. No OAuth, no Reddit account subscribe/unsubscribe.
- NSFW never gated (`include_over_18=on`).
- Stay on current Feed + Search screens; do not add Home/Bookmarks/Search destinations.
- Local persistence matches CookieStore: SharedPreferences, no encryption.
- Community results are always global; `restrict_sr` applies to posts only.
- Combined starred feed uses `/r/a+b+c/{sort}.json`; cap 20 names.
- Spec: `docs/superpowers/specs/2026-09-05-boostlite-search-bookmarks-design.md`

## File map

| File | Responsibility |
|---|---|
| `android-app/app/src/main/java/com/boostlite/reddit/data/BookmarkNames.kt` | Pure normalize/add/remove/toggle/join (no Android) |
| `android-app/app/src/main/java/com/boostlite/reddit/data/BookmarkStore.kt` | Prefs + StateFlow over BookmarkNames |
| `android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt` | Add `Subreddit`, `FeedTarget` |
| `android-app/app/src/main/java/com/boostlite/reddit/data/FeedSession.kt` | Shared `FeedTarget` so Search can open a sub |
| `android-app/app/src/main/java/com/boostlite/reddit/data/RedditUrls.kt` | Pure feed/search URL builders |
| `android-app/app/src/main/java/com/boostlite/reddit/data/RedditParser.kt` | `parseSubredditListing` |
| `android-app/app/src/main/java/com/boostlite/reddit/data/RedditRepository.kt` | Use RedditUrls; `searchSubreddits` |
| `android-app/app/src/main/java/com/boostlite/reddit/BoostLiteApp.kt` | Construct BookmarkStore + FeedSession |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedViewModel.kt` | Load by FeedTarget |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/feed/FeedScreen.kt` | Title, star, bookmarks sheet |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/components/SubredditRow.kt` | Community row |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/search/SearchViewModel.kt` | Parallel sr + link search |
| `android-app/app/src/main/java/com/boostlite/reddit/ui/screens/search/SearchScreen.kt` | Stacked results + always-on scope chips when opened from a sub |
| `android-app/app/src/test/java/com/boostlite/reddit/...` | JUnit tests |
| `android-app/app/build.gradle.kts` | `testImplementation` JUnit + org.json |

---

### Task 1: BookmarkNames (pure) + JVM tests

**Files:**
- Create: `android-app/app/src/main/java/com/boostlite/reddit/data/BookmarkNames.kt`
- Create: `android-app/app/src/test/java/com/boostlite/reddit/data/BookmarkNamesTest.kt`
- Modify: `android-app/app/build.gradle.kts` (add test deps)

**Produces:** `BookmarkNames.normalize`, `add`, `remove`, `toggle`, `isStarred`, `joinedForFeed`, `MAX_STARRED = 20`

- [ ] **Step 1: Add JUnit to the app module**

In `android-app/app/build.gradle.kts` `dependencies` block, append:

```kotlin
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
```

- [ ] **Step 2: Write failing tests**

```kotlin
package com.boostlite.reddit.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BookmarkNamesTest {
    @Test
    fun normalize_stripsPrefixAndRejectsAll() {
        assertEquals("Cats", BookmarkNames.normalize("r/Cats"))
        assertEquals("pics", BookmarkNames.normalize("/r/pics"))
        assertNull(BookmarkNames.normalize("all"))
        assertNull(BookmarkNames.normalize("r/all"))
        assertNull(BookmarkNames.normalize("frontpage"))
        assertNull(BookmarkNames.normalize("  "))
    }

    @Test
    fun add_isCaseInsensitiveAndPreservesFirstSpelling() {
        val (ok, names) = BookmarkNames.add(emptyList(), "Cats")
        assertTrue(ok)
        val (ok2, names2) = BookmarkNames.add(names, "cats")
        assertFalse(ok2)
        assertEquals(listOf("Cats"), names2)
    }

    @Test
    fun add_capsAt20() {
        val full = (1..20).map { "sub$it" }
        val (ok, names) = BookmarkNames.add(full, "extra")
        assertFalse(ok)
        assertEquals(20, names.size)
    }

    @Test
    fun toggle_addThenRemove() {
        val afterAdd = BookmarkNames.toggle(emptyList(), "pics")
        assertEquals(listOf("pics"), afterAdd.names)
        assertTrue(afterAdd.starred)
        val afterRemove = BookmarkNames.toggle(afterAdd.names, "pics")
        assertEquals(emptyList<String>(), afterRemove.names)
        assertFalse(afterRemove.starred)
    }

    @Test
    fun joinedForFeed_nullWhenEmpty_plusSeparated() {
        assertNull(BookmarkNames.joinedForFeed(emptyList()))
        assertEquals("a+b", BookmarkNames.joinedForFeed(listOf("a", "b")))
    }
}
```

- [ ] **Step 3: Run tests — expect fail (BookmarkNames missing)**

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
cd android-app && ./gradlew :app:testDebugUnitTest --tests com.boostlite.reddit.data.BookmarkNamesTest
```

Expected: compile failure, unresolved `BookmarkNames`.

- [ ] **Step 4: Implement BookmarkNames**

```kotlin
package com.boostlite.reddit.data

object BookmarkNames {
    const val MAX_STARRED = 20

    data class ToggleResult(val names: List<String>, val starred: Boolean)

    fun normalize(raw: String): String? {
        var s = raw.trim().removePrefix("/").removePrefix("r/").removePrefix("/r/").trim()
        if (s.startsWith("r/", ignoreCase = true)) s = s.substring(2).trim()
        if (s.isEmpty()) return null
        if (s.equals("all", ignoreCase = true) || s.equals("frontpage", ignoreCase = true)) return null
        return s
    }

    fun isStarred(names: List<String>, raw: String): Boolean {
        val n = normalize(raw) ?: return false
        return names.any { it.equals(n, ignoreCase = true) }
    }

    fun add(names: List<String>, raw: String): Pair<Boolean, List<String>> {
        val n = normalize(raw) ?: return false to names
        if (isStarred(names, n)) return false to names
        if (names.size >= MAX_STARRED) return false to names
        return true to names + n
    }

    fun remove(names: List<String>, raw: String): List<String> {
        val n = normalize(raw) ?: return names
        return names.filterNot { it.equals(n, ignoreCase = true) }
    }

    fun toggle(names: List<String>, raw: String): ToggleResult {
        return if (isStarred(names, raw)) {
            ToggleResult(remove(names, raw), starred = false)
        } else {
            val (ok, next) = add(names, raw)
            ToggleResult(next, starred = ok || isStarred(next, raw))
        }
    }

    fun joinedForFeed(names: List<String>): String? {
        val slice = names.take(MAX_STARRED)
        return slice.takeIf { it.isNotEmpty() }?.joinToString("+")
    }
}
```

Fix `normalize` so `r/Cats` → `Cats` (strip `r/` once after trim). Implementation:

```kotlin
fun normalize(raw: String): String? {
    var s = raw.trim()
    if (s.startsWith("/r/", ignoreCase = true)) s = s.substring(3)
    else if (s.startsWith("r/", ignoreCase = true)) s = s.substring(2)
    else if (s.startsWith("/")) s = s.substring(1)
    s = s.trim()
    if (s.isEmpty()) return null
    if (s.equals("all", ignoreCase = true) || s.equals("frontpage", ignoreCase = true)) return null
    return s
}
```

- [ ] **Step 5: Re-run tests — expect PASS**

Same gradle command. Expected: `BUILD SUCCESSFUL`, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add android-app/app/build.gradle.kts android-app/app/src/main/java/com/boostlite/reddit/data/BookmarkNames.kt android-app/app/src/test/java/com/boostlite/reddit/data/BookmarkNamesTest.kt
git commit -m "Add BookmarkNames with JVM tests for starred subs."
```

---

### Task 2: BookmarkStore + FeedSession

**Files:**
- Create: `android-app/app/src/main/java/com/boostlite/reddit/data/BookmarkStore.kt`
- Create: `android-app/app/src/main/java/com/boostlite/reddit/data/FeedSession.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt` — add `Subreddit` and `FeedTarget`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/BoostLiteApp.kt`

**Produces:** `BookmarkStore.names`, `add`/`remove`/`toggle`/`isStarred`/`joinedForFeed`; `FeedSession.target` + `open`

- [ ] **Step 1: Add models** at end of `Models.kt`:

```kotlin
data class Subreddit(
    val name: String,
    val title: String,
    val subscribers: Int,
    val over18: Boolean,
    val publicDescription: String,
)

sealed class FeedTarget {
    data object Starred : FeedTarget()
    data object All : FeedTarget()
    data class Subreddit(val name: String) : FeedTarget()
}
```

Name the nested class `FeedTarget.Named` if `Subreddit` clashes with the data class — **use `FeedTarget.Sub`** to avoid clash:

```kotlin
sealed class FeedTarget {
    data object Starred : FeedTarget()
    data object All : FeedTarget()
    data class Sub(val name: String) : FeedTarget()
}
```

(Spec said `FeedTarget.Subreddit`; implement as `FeedTarget.Sub` to avoid colliding with `data class Subreddit`.)

- [ ] **Step 2: BookmarkStore**

```kotlin
package com.boostlite.reddit.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class BookmarkStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val _names = MutableStateFlow(load())
    val names: StateFlow<List<String>> = _names.asStateFlow()

    fun isStarred(name: String): Boolean = BookmarkNames.isStarred(_names.value, name)

    fun add(name: String): Boolean {
        val (ok, next) = BookmarkNames.add(_names.value, name)
        if (ok) persist(next)
        return ok
    }

    fun remove(name: String) {
        persist(BookmarkNames.remove(_names.value, name))
    }

    fun toggle(name: String): Boolean {
        val result = BookmarkNames.toggle(_names.value, name)
        persist(result.names)
        return result.starred
    }

    fun joinedForFeed(): String? = BookmarkNames.joinedForFeed(_names.value)

    private fun load(): List<String> {
        val raw = prefs.getString(KEY, "").orEmpty()
        if (raw.isBlank()) return emptyList()
        return raw.split('\u001f').mapNotNull { BookmarkNames.normalize(it) }
    }

    private fun persist(names: List<String>) {
        prefs.edit().putString(KEY, names.joinToString("\u001f")).apply()
        _names.value = names
    }

    companion object {
        private const val PREFS = "boostlite_bookmarks"
        private const val KEY = "sub_names"
    }
}
```

- [ ] **Step 3: FeedSession**

```kotlin
package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.FeedTarget
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class FeedSession(private val bookmarks: BookmarkStore) {
    private val _target = MutableStateFlow(initial())
    val target: StateFlow<FeedTarget> = _target.asStateFlow()

    fun open(target: FeedTarget) {
        _target.value = when {
            target is FeedTarget.Starred && bookmarks.joinedForFeed() == null -> FeedTarget.All
            else -> target
        }
    }

    private fun initial(): FeedTarget =
        if (bookmarks.joinedForFeed() != null) FeedTarget.Starred else FeedTarget.All
}
```

- [ ] **Step 4: Wire BoostLiteApp** — after `cookieStore`, create `bookmarkStore` and `feedSession`; expose as `lateinit var` like `cookieStore`.

- [ ] **Step 5: Commit**

```bash
git add android-app/app/src/main/java/com/boostlite/reddit/data/BookmarkStore.kt \
  android-app/app/src/main/java/com/boostlite/reddit/data/FeedSession.kt \
  android-app/app/src/main/java/com/boostlite/reddit/data/model/Models.kt \
  android-app/app/src/main/java/com/boostlite/reddit/BoostLiteApp.kt
git commit -m "Add BookmarkStore and FeedSession for starred home."
```

---

### Task 3: RedditUrls + parseSubredditListing + searchSubreddits

**Files:**
- Create: `android-app/app/src/main/java/com/boostlite/reddit/data/RedditUrls.kt`
- Create: `android-app/app/src/test/java/com/boostlite/reddit/data/RedditUrlsTest.kt`
- Create: `android-app/app/src/test/java/com/boostlite/reddit/data/RedditParserSubredditTest.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/RedditParser.kt`
- Modify: `android-app/app/src/main/java/com/boostlite/reddit/data/RedditRepository.kt`

**Produces:** URL strings and `Listing<Subreddit>`

- [ ] **Step 1: Failing RedditUrlsTest**

```kotlin
package com.boostlite.reddit.data

import org.junit.Assert.assertTrue
import org.junit.Assert.assertFalse
import org.junit.Test

class RedditUrlsTest {
    @Test
    fun searchSubreddits_typeSr() {
        val url = RedditUrls.searchSubreddits("cats")
        assertTrue(url.contains("type=sr"))
        assertTrue(url.contains("include_over_18=on"))
        assertFalse(url.contains("restrict_sr"))
    }

    @Test
    fun searchPosts_global_noRestrict() {
        val url = RedditUrls.searchPosts("cats", subreddit = null)
        assertTrue(url.contains("type=link"))
        assertFalse(url.contains("restrict_sr"))
        assertFalse(url.contains("/r/"))
    }

    @Test
    fun searchPosts_scoped() {
        val url = RedditUrls.searchPosts("cats", subreddit = "pics")
        assertTrue(url.contains("/r/pics/search.json"))
        assertTrue(url.contains("restrict_sr=on"))
    }

    @Test
    fun feed_combined() {
        val url = RedditUrls.feed("pics+cats", sortPath = "hot")
        assertTrue(url.contains("/r/pics+cats/hot.json"))
    }
}
```

- [ ] **Step 2: Implement RedditUrls** (move logic from repository)

```kotlin
package com.boostlite.reddit.data

import java.net.URLEncoder

object RedditUrls {
    const val BASE = "https://www.reddit.com"

    fun feed(subreddit: String, sortPath: String, time: String = "all", after: String? = null): String {
        val sub = subreddit.trim().ifEmpty { "all" }
        return buildString {
            append(BASE)
            if (!sub.equals("frontpage", ignoreCase = true)) append("/r/").append(sub)
            append("/").append(sortPath).append(".json")
            append("?limit=50&raw_json=1&include_over_18=on")
            if (sortPath == "top") append("&t=").append(time)
            if (!after.isNullOrEmpty()) append("&after=").append(after)
        }
    }

    fun searchPosts(query: String, subreddit: String?, sort: String = "relevance", time: String = "all", after: String? = null): String {
        val q = URLEncoder.encode(query.trim(), "UTF-8")
        return buildString {
            append(BASE)
            if (!subreddit.isNullOrBlank()) append("/r/").append(subreddit.trim())
            append("/search.json?q=").append(q)
            append("&sort=").append(sort).append("&t=").append(time)
            append("&type=link&raw_json=1&include_over_18=on&limit=50")
            if (!subreddit.isNullOrBlank()) append("&restrict_sr=on")
            if (!after.isNullOrEmpty()) append("&after=").append(after)
        }
    }

    fun searchSubreddits(query: String): String {
        val q = URLEncoder.encode(query.trim(), "UTF-8")
        return "$BASE/search.json?q=$q&type=sr&include_over_18=on&limit=10&raw_json=1"
    }
}
```

Point `RedditRepository.feed` / `search` at these. Add:

```kotlin
suspend fun searchSubreddits(query: String): Listing<Subreddit> = withContext(Dispatchers.IO) {
    RedditParser.parseSubredditListing(client.getJson(RedditUrls.searchSubreddits(query)))
}
```

- [ ] **Step 3: Failing parser test** with mixed t5/t3 fixture; then implement `parseSubredditListing` keeping `kind=t5` only, mapping `display_name`, `title`, `subscribers`, `over_18`, `public_description`. Skip missing `data`.

- [ ] **Step 4: Run** `./gradlew :app:testDebugUnitTest` — all PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "Parse subreddit search JSON and centralize Reddit listing URLs."
```

---

### Task 4: FeedViewModel loads by FeedTarget

**Files:**
- Modify: `FeedViewModel.kt`
- Modify: `FeedScreen.kt` (title + search arg only in this task if needed; sheet in Task 5)

**Consumes:** `FeedSession`, `BookmarkStore`, `RedditRepository.feed`

- [ ] Observe `feedSession.target` and `bookmarkStore.names`. On change, `load()`.
- [ ] `listingSubreddit()`: `Starred` → `joinedForFeed() ?: "all"` (and `open(All)` if null); `All` → `"all"`; `Sub(name)` → `name`.
- [ ] Title helper: Starred → `"Starred"`; All → `"r/all"`; Sub → `"r/$name"`.
- [ ] `onOpenSearch`: pass `name` only when target is `FeedTarget.Sub`.
- [ ] When last star removed while target is Starred, `feedSession.open(All)`.
- [ ] Keep cookie-header collect → `load()`.
- [ ] Commit: `git commit -m "Drive the feed from FeedTarget including starred combined listings."`

---

### Task 5: Bookmarks sheet + star on title bar

**Files:**
- Modify: `FeedScreen.kt` — replace `SubredditDialog` with a ModalBottomSheet (or AlertDialog list if sheet is heavy): Starred row, r/all, starred names with unstar, go-to field.
- Title bar star visible only for `FeedTarget.Sub`; toast on cap (`add` returns false).

- [ ] Commit: `git commit -m "Replace subreddit dialog with starred bookmarks sheet."`

---

### Task 6: Search — communities then posts, scoped chips

**Files:**
- Create: `SubredditRow.kt`
- Modify: `SearchViewModel.kt` — `SearchResults(communities, posts)`; parallel fetch; partial success
- Modify: `SearchScreen.kt` — stacked list; chips whenever `restrictSubreddit != null`; star on row; tap community → `feedSession.open(Sub(name))` + `onBack()`
- Modify: `BoostNavHost.kt` — feed already passes sub only for named subs (Task 4)

SearchViewModel submit:

```kotlin
val communities = runCatching { repo.searchSubreddits(q) }.getOrNull()
val posts = runCatching { repo.search(q, subreddit = _restrictSub.value) }.getOrNull()
```

If both null, map exception: prefer SessionExpired if either failed that way (keep first error). If one non-null, `Success` with empty list for the failed side.

- [ ] Commit: `git commit -m "Show community hits above posts and default in-sub search scope."`

---

### Task 7: Assemble debug and smoke checklist

- [ ] `./gradlew :app:assembleDebug` — BUILD SUCCESSFUL
- [ ] If emulator/device attached: `make android-install`
- [ ] Manual: star two subs → home title Starred, Hot/New mix; search from a sub shows r/{sub} chip; search communities appear above posts; unstar last → r/all
- [ ] Commit plan checkboxes if needed; no extra product commits unless fixes

---

## Self-review

- Spec: community search, scoped posts, starred home, bookmarks list, cap 20, local prefs, no OAuth — all tasked.
- `FeedTarget.Sub` instead of `FeedTarget.Subreddit` to avoid name clash with `data class Subreddit` — called out in Task 2.
- No placeholders. Tests are JVM-only as specified.
