package com.boostlite.reddit.ui.list

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CenteredItemTest {

    @Test
    fun empty_returnsNull() {
        assertNull(centeredItemKey(0, 1000, emptyList()))
    }

    @Test
    fun prefersItemContainingViewportCenter() {
        val items = listOf(
            VisibleItemBounds("a", offset = 0, size = 400),
            VisibleItemBounds("b", offset = 400, size = 400),
            VisibleItemBounds("c", offset = 800, size = 400),
        )
        assertEquals("b", centeredItemKey(0, 1000, items))
    }

    @Test
    fun firstItemWhenCenterIsNearTop() {
        val items = listOf(
            VisibleItemBounds("a", offset = 0, size = 600),
            VisibleItemBounds("b", offset = 600, size = 600),
        )
        assertEquals("a", centeredItemKey(0, 1000, items))
    }

    @Test
    fun closestItemWhenCenterFallsInAGap() {
        val items = listOf(
            VisibleItemBounds("a", offset = 0, size = 200),
            VisibleItemBounds("b", offset = 700, size = 200),
        )
        assertEquals("b", centeredItemKey(0, 1000, items))
    }
}
