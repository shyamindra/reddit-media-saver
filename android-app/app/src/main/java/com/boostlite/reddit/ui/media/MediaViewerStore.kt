package com.boostlite.reddit.ui.media

import com.boostlite.reddit.data.model.RedditPost
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Session overlay for fullscreen media. Holds the listing/detail post already
 * in memory so the viewer does not refetch.
 */
class MediaViewerStore {

    private val _post = MutableStateFlow<RedditPost?>(null)
    val post: StateFlow<RedditPost?> = _post.asStateFlow()

    private val _autoplay = MutableStateFlow(false)
    val autoplay: StateFlow<Boolean> = _autoplay.asStateFlow()

    fun open(post: RedditPost, autoplay: Boolean = false) {
        if (post.media.previewUrl.isNullOrBlank()) return
        _autoplay.value = autoplay
        _post.value = post
    }

    fun close() {
        _post.value = null
        _autoplay.value = false
    }

    /**
     * True when Comments should push the post screen. False when that post is
     * already showing (or nothing is open) so the overlay should just dismiss.
     */
    fun commentsNeedsNavigation(currentPermalink: String?): Boolean {
        val open = _post.value ?: return false
        val current = currentPermalink?.trim().orEmpty()
        if (current.isEmpty()) return true
        return normalizePermalink(current) != normalizePermalink(open.permalink)
    }
}

internal fun normalizePermalink(raw: String): String {
    var s = raw.trim()
    s = s.removePrefix("https://www.reddit.com")
        .removePrefix("http://www.reddit.com")
        .removePrefix("https://old.reddit.com")
        .removePrefix("http://old.reddit.com")
        .removePrefix("https://reddit.com")
        .removePrefix("http://reddit.com")
    if (!s.startsWith("/")) s = "/$s"
    return s.trimEnd('/').lowercase()
}
