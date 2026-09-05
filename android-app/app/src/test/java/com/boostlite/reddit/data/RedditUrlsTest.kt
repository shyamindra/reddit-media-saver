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
    fun searchPosts_nsfwAndRawJson() {
        val url = RedditUrls.searchPosts("cats", subreddit = null)
        assertTrue(url.contains("include_over_18=on"))
        assertTrue(url.contains("raw_json=1"))
    }
}
