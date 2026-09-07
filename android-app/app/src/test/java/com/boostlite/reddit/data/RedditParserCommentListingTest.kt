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
