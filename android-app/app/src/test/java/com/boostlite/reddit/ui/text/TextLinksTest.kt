package com.boostlite.reddit.ui.text

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TextLinksTest {

    @Test
    fun markdownLink_usesLabelAndUrl() {
        val linked = linkify("see [cats](https://example.com/a) now")
        assertEquals("see cats now", linked.text)
        assertEquals(listOf(TextLink(4, 8, "https://example.com/a")), linked.links)
    }

    @Test
    fun bareUrl_isLinked() {
        val linked = linkify("go https://example.com/x today")
        assertEquals("go https://example.com/x today", linked.text)
        val link = linked.links.single()
        assertEquals("https://example.com/x", link.url)
        assertEquals("https://example.com/x", linked.text.substring(link.start, link.end))
    }

    @Test
    fun trailingPunctuation_isNotPartOfUrl() {
        val linked = linkify("see https://example.com.")
        assertEquals("see https://example.com.", linked.text)
        assertEquals("https://example.com", linked.links.single().url)
        assertEquals("https://example.com", linked.text.substring(linked.links.single().start, linked.links.single().end))
    }

    @Test
    fun relativeRedditLink() {
        val linked = linkify("[pics](/r/pics)")
        assertEquals("pics", linked.text)
        assertEquals("https://www.reddit.com/r/pics", linked.links.single().url)
    }

    @Test
    fun noLinks_unchanged() {
        val linked = linkify("plain comment")
        assertEquals("plain comment", linked.text)
        assertTrue(linked.links.isEmpty())
    }
}
