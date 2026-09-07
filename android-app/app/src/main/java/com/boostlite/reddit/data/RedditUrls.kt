package com.boostlite.reddit.data

import java.net.URLEncoder

object RedditUrls {
    const val BASE = "https://www.reddit.com"

    fun feed(subreddit: String, sortPath: String, time: String = "all", after: String? = null): String {
        val sub = subreddit.trim().ifEmpty { "all" }
        return buildString {
            append(BASE)
            if (!sub.equals("frontpage", ignoreCase = true)) append("/r/").append(sub)
            append("/").append(sortPath).append(".json")
            append("?limit=50&raw_json=1&include_over_18=on")
            append("&t=").append(time)
            if (!after.isNullOrEmpty()) append("&after=").append(after)
        }
    }

    fun userSubmitted(
        name: String,
        sortPath: String,
        time: String = "all",
        after: String? = null,
    ): String {
        val user = URLEncoder.encode(name.trim(), "UTF-8")
        return buildString {
            append(BASE).append("/user/").append(user).append("/submitted.json")
            append("?limit=50&raw_json=1&include_over_18=on")
            append("&sort=").append(sortPath)
            append("&t=").append(time)
            if (!after.isNullOrEmpty()) append("&after=").append(after)
        }
    }

    fun userComments(
        name: String,
        sortPath: String,
        time: String = "all",
        after: String? = null,
    ): String {
        val user = URLEncoder.encode(name.trim(), "UTF-8")
        return buildString {
            append(BASE).append("/user/").append(user).append("/comments.json")
            append("?limit=50&raw_json=1&include_over_18=on")
            append("&sort=").append(sortPath)
            append("&t=").append(time)
            if (!after.isNullOrEmpty()) append("&after=").append(after)
        }
    }

    fun searchPosts(
        query: String,
        subreddit: String?,
        sort: String = "relevance",
        time: String = "all",
        after: String? = null,
    ): String {
        val q = URLEncoder.encode(query.trim(), "UTF-8")
        return buildString {
            append(BASE)
            if (!subreddit.isNullOrBlank()) append("/r/").append(subreddit.trim())
            append("/search.json?q=").append(q)
            append("&sort=").append(sort)
            append("&t=").append(time)
            append("&type=link&raw_json=1&include_over_18=on&limit=50")
            if (!subreddit.isNullOrBlank()) append("&restrict_sr=on")
            if (!after.isNullOrEmpty()) append("&after=").append(after)
        }
    }

    fun searchSubreddits(query: String): String {
        val q = URLEncoder.encode(query.trim(), "UTF-8")
        return "$BASE/search.json?q=$q&type=sr&include_over_18=on&limit=10&raw_json=1"
    }

    fun postComments(permalink: String): String {
        val raw = permalink.trim()
        val path = if (raw.startsWith("http://") || raw.startsWith("https://")) {
            raw
        } else {
            BASE + (if (raw.startsWith("/")) raw else "/$raw")
        }.substringBefore('?')
        val withSlash = if (path.endsWith("/")) path else "$path/"
        return "${withSlash}.json?raw_json=1&include_over_18=on&limit=200&sort=confidence"
    }
}
