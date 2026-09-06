package com.boostlite.reddit.ui.text

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RedditMarkdownTest {
    @Test
    fun bold_and_italic_stripMarkers() {
        val f = formatRedditText("say **hi** and *there*")
        assertEquals("say hi and there", f.text)
        assertTrue(f.spans.any { it.style == MdStyle.BOLD && f.text.substring(it.start, it.end) == "hi" })
        assertTrue(f.spans.any { it.style == MdStyle.ITALIC && f.text.substring(it.start, it.end) == "there" })
    }

    @Test
    fun strike_code_quote_heading() {
        val f = formatRedditText("~~x~~ and `y`\n> q\n# H")
        assertTrue(f.text.contains("x") && f.text.contains("y"))
        assertTrue(f.spans.any { it.style == MdStyle.STRIKE })
        assertTrue(f.spans.any { it.style == MdStyle.CODE })
        assertTrue(f.spans.any { it.style == MdStyle.QUOTE })
        assertTrue(f.spans.any { it.style == MdStyle.HEADING })
    }

    @Test
    fun markdownLink_stillWorks() {
        val f = formatRedditText("see [cats](https://example.com/a)")
        assertEquals("see cats", f.text)
        assertEquals("https://example.com/a", f.links.single().url)
    }

    @Test
    fun redditInApp_subAndUser() {
        assertEquals(RedditInApp.Sub("pics"), redditInApp("https://www.reddit.com/r/pics"))
        assertEquals(RedditInApp.User("spez"), redditInApp("https://www.reddit.com/u/spez"))
        assertEquals(RedditInApp.User("spez"), redditInApp("https://www.reddit.com/user/spez"))
        assertEquals(null, redditInApp("https://example.com/x"))
    }

    @Test
    fun starList_isNotItalic() {
        val f = formatRedditText("* first\n* second")
        assertEquals("* first\n* second", f.text)
        assertTrue(f.spans.any { it.style == MdStyle.LIST })
        assertTrue(f.spans.none { it.style == MdStyle.ITALIC })
    }

    @Test
    fun quote_withBareUrl_stillQuoted() {
        val f = formatRedditText("> see https://example.com")
        assertEquals("see https://example.com", f.text)
        assertTrue(f.spans.any { it.style == MdStyle.QUOTE })
        assertEquals("https://example.com", f.links.single().url)
    }

    @Test
    fun headingAndList_withBareUrls_keepBlockStyles() {
        val f = formatRedditText("# see https://example.com\n- visit https://example.org")
        assertEquals("see https://example.com\n- visit https://example.org", f.text)
        assertTrue(f.spans.any { it.style == MdStyle.HEADING })
        assertTrue(f.spans.any { it.style == MdStyle.LIST })
        assertEquals(listOf("https://example.com", "https://example.org"), f.links.map { it.url })
    }
}
