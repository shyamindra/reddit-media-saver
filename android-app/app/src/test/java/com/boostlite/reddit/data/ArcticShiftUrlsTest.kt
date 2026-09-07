package com.boostlite.reddit.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ArcticShiftUrlsTest {
    @Test
    fun posts_authorLimitSort() {
        val url = ArcticShiftUrls.posts("spez")
        assertTrue(url.startsWith("https://arctic-shift.photon-reddit.com/api/posts/search?"))
        assertTrue(url.contains("author=spez"))
        assertTrue(url.contains("limit=100"))
        assertTrue(url.contains("sort=desc"))
        assertFalse(url.contains("before="))
    }

    @Test
    fun comments_includesBefore() {
        val url = ArcticShiftUrls.comments("spez", beforeUtc = 1700000000L)
        assertTrue(url.startsWith("https://arctic-shift.photon-reddit.com/api/comments/search?"))
        assertTrue(url.contains("author=spez"))
        assertTrue(url.contains("before=1700000000"))
    }
}
