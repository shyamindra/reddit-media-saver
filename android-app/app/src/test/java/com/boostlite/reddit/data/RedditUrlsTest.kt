package com.boostlite.reddit.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
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

    @Test
    fun feed_nsfwAndRawJson() {
        val url = RedditUrls.feed("pics", sortPath = "hot")
        assertTrue(url.contains("include_over_18=on"))
        assertTrue(url.contains("raw_json=1"))
    }

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

    @Test
    fun searchPosts_top_includesTime() {
        val url = RedditUrls.searchPosts("cats", subreddit = null, sort = "top", time = "week")
        assertTrue(url.contains("sort=top"))
        assertTrue(url.contains("t=week"))
    }

    @Test
    fun searchPosts_new_includesTime() {
        val url = RedditUrls.searchPosts("cats", subreddit = null, sort = "new", time = "day")
        assertTrue(url.contains("sort=new"))
        assertTrue(url.contains("t=day"))
    }

    @Test
    fun searchPosts_relevance_includesTime() {
        val url = RedditUrls.searchPosts("cats", subreddit = null, sort = "relevance", time = "year")
        assertTrue(url.contains("sort=relevance"))
        assertTrue(url.contains("t=year"))
    }

    @Test
    fun searchPosts_hot_includesTime() {
        val url = RedditUrls.searchPosts("cats", subreddit = null, sort = "hot", time = "month")
        assertTrue(url.contains("sort=hot"))
        assertTrue(url.contains("t=month"))
    }

    @Test
    fun feed_allSorts_includeTime() {
        val hot = RedditUrls.feed("pics", sortPath = "hot", time = "week")
        assertTrue(hot.contains("/hot.json"))
        assertTrue(hot.contains("t=week"))
        val neu = RedditUrls.feed("pics", sortPath = "new", time = "day")
        assertTrue(neu.contains("t=day"))
    }
}
