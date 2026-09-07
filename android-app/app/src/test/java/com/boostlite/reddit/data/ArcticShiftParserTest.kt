package com.boostlite.reddit.data

import org.junit.Assert.assertEquals
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
