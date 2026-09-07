package com.boostlite.reddit.data

import java.net.URLEncoder

object ArcticShiftUrls {
    const val BASE = "https://arctic-shift.photon-reddit.com"

    fun posts(author: String, beforeUtc: Long? = null): String =
        search("/api/posts/search", author, beforeUtc)

    fun comments(author: String, beforeUtc: Long? = null): String =
        search("/api/comments/search", author, beforeUtc)

    private fun search(path: String, author: String, beforeUtc: Long?): String {
        val name = URLEncoder.encode(author.trim(), "UTF-8")
        return buildString {
            append(BASE).append(path)
            append("?author=").append(name)
            append("&limit=100&sort=desc")
            if (beforeUtc != null) append("&before=").append(beforeUtc)
        }
    }
}
