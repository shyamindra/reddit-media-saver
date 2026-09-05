package com.boostlite.reddit.data

import org.junit.Assert.assertEquals
import org.junit.Test

class HtmlEntitiesTest {

    @Test
    fun apostropheDecimalAndNamed() {
        assertEquals("It's fine", HtmlEntities.decode("It&#39;s fine"))
        assertEquals("It's fine", HtmlEntities.decode("It&apos;s fine"))
        assertEquals("It's fine", HtmlEntities.decode("It&#x27;s fine"))
    }

    @Test
    fun doubleEncodedApostrophe() {
        assertEquals("It's a test", HtmlEntities.decode("It&amp;#39;s a test"))
    }

    @Test
    fun curlyApostrophesBecomeAscii() {
        assertEquals("It's fine", HtmlEntities.decode("It\u2019s fine"))
        assertEquals("It's fine", HtmlEntities.decode("It&#8217;s fine"))
        assertEquals("It's fine", HtmlEntities.decode("It&rsquo;s fine"))
        assertEquals("'hello'", HtmlEntities.decode("&lsquo;hello&rsquo;"))
    }

    @Test
    fun contractionDropsStraySpaceAfterApostrophe() {
        assertEquals("It's fine", HtmlEntities.decode("It' s fine"))
        assertEquals("don't", HtmlEntities.decode("don\u2019 t"))
    }

    @Test
    fun quotesAmpersandAndNbsp() {
        assertEquals("\"cats\" & dogs", HtmlEntities.decode("&quot;cats&quot; &amp; dogs"))
        assertEquals("foo bar", HtmlEntities.decode("foo&nbsp;bar"))
    }

    @Test
    fun dashes() {
        assertEquals("yes \u2014 no", HtmlEntities.decode("yes &mdash; no"))
    }

    @Test
    fun leavesNormalTextAndBareAmpersand() {
        assertEquals("plain title", HtmlEntities.decode("plain title"))
        assertEquals("a & b", HtmlEntities.decode("a & b"))
    }
}
