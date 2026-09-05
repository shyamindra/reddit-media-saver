package com.boostlite.reddit.data.model

enum class MediaType { IMAGE, GIF, VIDEO, GALLERY, LINK, TEXT, NONE }

data class PostMedia(
    val type: MediaType,
    /** Primary display URL (image, gif, or preview image for a video/link). */
    val previewUrl: String? = null,
    /** For VIDEO: a playable stream (DASH/HLS/mp4). */
    val videoUrl: String? = null,
    /** For VIDEO with separate audio track (v.redd.it). */
    val audioUrl: String? = null,
    /** For GALLERY: ordered full-size image URLs. */
    val galleryUrls: List<String> = emptyList(),
    /** The best single URL to hand to the downloader. */
    val downloadUrl: String? = null,
)

data class RedditPost(
    val id: String,
    val fullname: String,
    val title: String,
    val author: String,
    val subreddit: String,
    val permalink: String,
    val linkUrl: String?,
    val score: Int,
    val numComments: Int,
    val createdUtc: Long,
    val over18: Boolean,
    val domain: String?,
    val selftext: String?,
    val media: PostMedia,
)

data class RedditComment(
    val id: String,
    val author: String,
    val body: String,
    val score: Int,
    val depth: Int,
    val createdUtc: Long,
)

data class Listing<T>(
    val items: List<T>,
    val after: String?,
)

enum class FeedSort(val path: String, val label: String) {
    HOT("hot", "Hot"),
    NEW("new", "New"),
    TOP("top", "Top"),
    RISING("rising", "Rising"),
}

data class Subreddit(
    val name: String,
    val title: String,
    val subscribers: Int,
    val over18: Boolean,
    val publicDescription: String,
)

sealed class FeedTarget {
    data object Starred : FeedTarget()
    data object All : FeedTarget()
    data class Sub(val name: String) : FeedTarget()
}
