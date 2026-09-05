package com.boostlite.reddit.ui.media

import com.boostlite.reddit.data.model.MediaType
import com.boostlite.reddit.data.model.PostMedia
import com.boostlite.reddit.data.model.RedditPost
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MediaViewerStoreTest {

    private fun post(
        preview: String? = "https://i.redd.it/x.jpg",
        permalink: String = "/r/pics/comments/abc/hi/",
    ) = RedditPost(
        id = "abc",
        fullname = "t3_abc",
        title = "Hi",
        author = "u",
        subreddit = "pics",
        permalink = permalink,
        linkUrl = null,
        score = 1,
        numComments = 0,
        createdUtc = 0,
        over18 = false,
        domain = null,
        selftext = null,
        media = PostMedia(type = MediaType.IMAGE, previewUrl = preview, downloadUrl = preview),
    )

    @Test
    fun open_autoplayDefaultsFalseAndCanBeSet() {
        val store = MediaViewerStore()
        val p = post()
        store.open(p)
        assertFalse(store.autoplay.value)
        store.open(p, autoplay = true)
        assertTrue(store.autoplay.value)
        assertEquals(p, store.post.value)
        store.close()
        assertFalse(store.autoplay.value)
        assertNull(store.post.value)
    }

    @Test
    fun open_setsPostWhenPreviewExists() {
        val store = MediaViewerStore()
        val p = post()
        store.open(p)
        assertEquals(p, store.post.value)
    }

    @Test
    fun open_ignoresPostWithoutPreview() {
        val store = MediaViewerStore()
        store.open(post(preview = null))
        assertNull(store.post.value)
        store.open(post(preview = "  "))
        assertNull(store.post.value)
    }

    @Test
    fun close_clears() {
        val store = MediaViewerStore()
        store.open(post())
        store.close()
        assertNull(store.post.value)
    }

    @Test
    fun commentsNeedsNavigation_falseWhenAlreadyOnThisPost() {
        val store = MediaViewerStore()
        store.open(post(permalink = "/r/pics/comments/abc/hi/"))
        assertFalse(store.commentsNeedsNavigation("/r/pics/comments/abc/hi/"))
        assertFalse(store.commentsNeedsNavigation("https://www.reddit.com/r/pics/comments/abc/hi"))
        assertFalse(store.commentsNeedsNavigation("/r/pics/comments/abc/hi"))
    }

    @Test
    fun commentsNeedsNavigation_trueWhenDifferentOrUnknown() {
        val store = MediaViewerStore()
        store.open(post(permalink = "/r/pics/comments/abc/hi/"))
        assertTrue(store.commentsNeedsNavigation(null))
        assertTrue(store.commentsNeedsNavigation(""))
        assertTrue(store.commentsNeedsNavigation("/r/pics/comments/zzz/other/"))
    }

    @Test
    fun commentsNeedsNavigation_falseWhenNothingOpen() {
        val store = MediaViewerStore()
        assertFalse(store.commentsNeedsNavigation(null))
        assertFalse(store.commentsNeedsNavigation("/r/pics/comments/abc/hi/"))
    }
}
