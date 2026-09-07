package com.boostlite.reddit.ui.components

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PostCardTest {

    @Test
    fun mountsPlayerOnlyWhileCentered() {
        assertTrue(shouldMountFeedVideoPlayer(hasStream = true, centered = true))
        assertFalse(shouldMountFeedVideoPlayer(hasStream = true, centered = false))
    }

    @Test
    fun doesNotMountPlayerWithoutAStream() {
        assertFalse(shouldMountFeedVideoPlayer(hasStream = false, centered = true))
        assertFalse(shouldMountFeedVideoPlayer(hasStream = false, centered = false))
    }

    @Test
    fun stillDoesNotForceCardWidth() {
        assertFalse(feedStillForcesCardWidth())
    }
}
