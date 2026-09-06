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
        video: String? = null,
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
        media = PostMedia(
            type = if (video != null) MediaType.VIDEO else MediaType.IMAGE,
            previewUrl = preview,
            videoUrl = video,
            downloadUrl = video ?: preview,
        ),
    )

    @Test
    fun open_autoplayDefaultsTrue() {
        val store = MediaViewerStore()
        val p = post()
        store.open(p)
        assertTrue(store.autoplay.value)
        store.open(p, autoplay = false)
        assertFalse(store.autoplay.value)
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
    fun open_ignoresPostWithoutMedia() {
        val store = MediaViewerStore()
        store.open(post(preview = null))
        assertNull(store.post.value)
        store.open(post(preview = "  "))
        assertNull(store.post.value)
    }

    @Test
    fun open_allowsVideoWithoutPreview() {
        val store = MediaViewerStore()
        val p = post(preview = null, video = "https://v.redd.it/vid/DASH_1080.mp4")
        store.open(p, autoplay = true)
        assertEquals(p, store.post.value)
        assertTrue(store.autoplay.value)
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
