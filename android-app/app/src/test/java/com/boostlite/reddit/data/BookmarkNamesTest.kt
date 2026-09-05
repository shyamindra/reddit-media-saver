package com.boostlite.reddit.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BookmarkNamesTest {
    @Test
    fun normalize_stripsPrefixAndRejectsAll() {
        assertEquals("Cats", BookmarkNames.normalize("r/Cats"))
        assertEquals("pics", BookmarkNames.normalize("/r/pics"))
        assertNull(BookmarkNames.normalize("all"))
        assertNull(BookmarkNames.normalize("r/all"))
        assertNull(BookmarkNames.normalize("frontpage"))
        assertNull(BookmarkNames.normalize("  "))
    }

    @Test
    fun add_isCaseInsensitiveAndPreservesFirstSpelling() {
        val (ok, names) = BookmarkNames.add(emptyList(), "Cats")
        assertTrue(ok)
        val (ok2, names2) = BookmarkNames.add(names, "cats")
        assertFalse(ok2)
        assertEquals(listOf("Cats"), names2)
    }

    @Test
    fun add_capsAt20() {
        val full = (1..20).map { "sub$it" }
        val (ok, names) = BookmarkNames.add(full, "extra")
        assertFalse(ok)
        assertEquals(20, names.size)
    }

    @Test
    fun toggle_addThenRemove() {
        val afterAdd = BookmarkNames.toggle(emptyList(), "pics")
        assertEquals(listOf("pics"), afterAdd.names)
        assertTrue(afterAdd.starred)
        val afterRemove = BookmarkNames.toggle(afterAdd.names, "pics")
        assertEquals(emptyList<String>(), afterRemove.names)
        assertFalse(afterRemove.starred)
    }

    @Test
    fun joinedForFeed_nullWhenEmpty_plusSeparated() {
        assertNull(BookmarkNames.joinedForFeed(emptyList()))
        assertEquals("a+b", BookmarkNames.joinedForFeed(listOf("a", "b")))
    }
}
