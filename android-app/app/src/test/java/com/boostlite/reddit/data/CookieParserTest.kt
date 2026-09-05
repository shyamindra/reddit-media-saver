package com.boostlite.reddit.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CookieParserTest {

    private val sample = """
        # Netscape HTTP Cookie File
        # This is a generated file! Do not edit.

        .reddit.com	TRUE	/	TRUE	9999999999	reddit_session	session_abc
        .google.com	TRUE	/	TRUE	9999999999	SID	ignore_me
        #HttpOnly_.reddit.com	TRUE	/	TRUE	9999999999	token_v2	token_xyz
        .reddit.com	TRUE	/	FALSE	1000	expired	old
    """.trimIndent()

    @Test
    fun netscape_keepsHttpOnlyRedditCookies() {
        assertEquals(
            "reddit_session=session_abc; token_v2=token_xyz",
            CookieParser.parse(sample),
        )
    }

    @Test
    fun netscape_lastWinsByName() {
        val text = """
            .reddit.com	TRUE	/	TRUE	9999999999	reddit_session	old
            .reddit.com	TRUE	/	TRUE	9999999999	loid	loid_1
            .reddit.com	TRUE	/	TRUE	9999999999	reddit_session	fresh
        """.trimIndent()
        assertEquals("reddit_session=fresh; loid=loid_1", CookieParser.parse(text))
    }

    @Test
    fun headerString_passthrough() {
        assertEquals(
            "reddit_session=abc; loid=xyz",
            CookieParser.parse("reddit_session=abc; loid=xyz"),
        )
    }

    @Test
    fun empty_returnsEmpty() {
        assertEquals("", CookieParser.parse(""))
        assertEquals("", CookieParser.parse("   "))
    }

    @Test
    fun hasSession_tokenOrLoidOrRedditSession() {
        assertTrue(CookieParser.hasSession("token_v2=x"))
        assertTrue(CookieParser.hasSession("loid=x"))
        assertTrue(CookieParser.hasSession("reddit_session=x"))
        assertFalse(CookieParser.hasSession("other=x"))
    }
}
