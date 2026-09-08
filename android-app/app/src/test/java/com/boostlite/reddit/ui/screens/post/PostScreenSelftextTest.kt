package com.boostlite.reddit.ui.screens.post

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PostScreenSelftextTest {
    @Test
    fun imagePostWithCaption_showsSelftext() {
        assertTrue(shouldRenderSelftext("Thailand agencies…"))
    }

    @Test
    fun blankSelftext_hiddenEvenOnTextPosts() {
        assertFalse(shouldRenderSelftext("  "))
        assertFalse(shouldRenderSelftext(null))
    }
}
