package com.boostlite.reddit.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RedditClientAuthTest {
    @Test
    fun authHeaders_alwaysIncludeUa() {
        val headers = RedditClient.authHeaders("")
        assertEquals(RedditClient.DESKTOP_UA, headers["User-Agent"])
        assertFalse(headers.containsKey("Cookie"))
    }

    @Test
    fun authHeaders_includeCookieWhenPresent() {
        val headers = RedditClient.authHeaders("reddit_session=abc")
        assertEquals("reddit_session=abc", headers["Cookie"])
        assertTrue(headers.containsKey("User-Agent"))
    }
}
