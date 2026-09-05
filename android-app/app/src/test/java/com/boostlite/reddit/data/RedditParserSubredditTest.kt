package com.boostlite.reddit.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RedditParserSubredditTest {
    @Test
    fun parseSubredditListing_keepsT5SkipsT3() {
        val json = """
            {"kind":"Listing","data":{"after":null,"children":[
              {"kind":"t5","data":{"display_name":"cats","title":"Cats","subscribers":100,"over_18":false,"public_description":"Meow"}},
              {"kind":"t3","data":{"id":"abc","title":"a post"}},
              {"kind":"t5","data":{"display_name":"CatsStandingUp","title":"","subscribers":0,"over_18":true,"public_description":""}}
            ]}}
        """.trimIndent()
        val listing = RedditParser.parseSubredditListing(json)
        assertEquals(2, listing.items.size)
        assertEquals("cats", listing.items[0].name)
        assertEquals("Meow", listing.items[0].publicDescription)
        assertEquals(100, listing.items[0].subscribers)
        assertTrue(listing.items[1].over18)
    }

    @Test
    fun parseSubredditListing_emptyChildren() {
        val json = """{"kind":"Listing","data":{"children":[]}}"""
        val listing = RedditParser.parseSubredditListing(json)
        assertTrue(listing.items.isEmpty())
    }

    @Test
    fun parseListing_keepsStickied() {
        val json = """
            {"kind":"Listing","data":{"after":null,"children":[
              {"kind":"t3","data":{"id":"pin","name":"t3_pin","title":"Pinned","author":"mod","subreddit":"test","permalink":"/r/test/comments/pin/x/","stickied":true}}
            ]}}
        """.trimIndent()
        val listing = RedditParser.parseListing(json)
        assertEquals(1, listing.items.size)
        assertEquals("pin", listing.items[0].id)
    }

    @Test
    fun parseSubredditListing_skipsMissingData() {
        val json = """{"kind":"Listing","data":{"children":[{"kind":"t5"}]}}"""
        val listing = RedditParser.parseSubredditListing(json)
        assertTrue(listing.items.isEmpty())
    }
}
