package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.FeedSort
import com.boostlite.reddit.data.model.Listing
import com.boostlite.reddit.data.model.MediaType
import com.boostlite.reddit.data.model.PostMedia
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

    @Test
    fun comments_emptyLive_loadsArchive() {
        val h = UserHistory(
            livePosts = { _, _, _, _ -> Listing(emptyList(), null) },
            liveComments = { _, _, _, _ -> Listing(emptyList(), null) },
            archiveGet = JsonGetter {
                """{"data":[{"id":"c1","author":"spez","body":"yo","score":1,"created_utc":222,
                    "subreddit":"pics","permalink":"/r/pics/comments/p1/hi/c1/"}]}"""
            },
        )
        val page = kotlinx.coroutines.runBlocking {
            h.comments("spez", FeedSort.HOT, "all", null)
        }
        assertTrue(page.fromArchive)
        assertEquals("c1", page.items.single().id)
        assertEquals("222", page.after)
    }

    @Test
    fun posts_archiveCursor_skipsLive() {
        var liveHits = 0
        val h = UserHistory(
            livePosts = { _, _, _, _ -> liveHits++; Listing(emptyList(), null) },
            liveComments = { _, _, _, _ -> Listing(emptyList(), null) },
            archiveGet = JsonGetter { url ->
                assertTrue(url.contains("before=111"))
                """{"data":[{"id":"p2","title":"Next","author":"spez","subreddit":"pics",
                    "permalink":"/r/pics/comments/p2/next/","created_utc":100}]}"""
            },
        )
        val page = kotlinx.coroutines.runBlocking {
            h.posts("spez", FeedSort.HOT, "all", "111")
        }
        assertEquals(0, liveHits)
        assertTrue(page.fromArchive)
        assertEquals("p2", page.items.single().id)
    }
}
