package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.FeedSort
import com.boostlite.reddit.data.model.Listing
import com.boostlite.reddit.data.model.RedditComment
import com.boostlite.reddit.data.model.RedditPost
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URLEncoder

/**
 * Builds Reddit `.json` endpoints and returns parsed domain models.
 *
 * NSFW is never gated: `include_over_18=on` is always sent and `over_18` is not
 * used to filter anything.
 */
class RedditRepository(
    private val client: RedditClient,
) {

    suspend fun feed(
        subreddit: String,
        sort: FeedSort,
        time: String = "all",
        after: String? = null,
    ): Listing<RedditPost> = withContext(Dispatchers.IO) {
        val sub = subreddit.trim().ifEmpty { DEFAULT_SUB }
        val url = buildString {
            append(BASE)
            if (!sub.equals("frontpage", ignoreCase = true)) {
                append("/r/").append(sub)
            }
            append("/").append(sort.path).append(".json")
            append("?limit=50&raw_json=1&include_over_18=on")
            if (sort == FeedSort.TOP) append("&t=").append(time)
            if (!after.isNullOrEmpty()) append("&after=").append(after)
        }
        RedditParser.parseListing(client.getJson(url))
    }

    suspend fun postWithComments(
        permalink: String,
    ): RedditParser.PostWithComments = withContext(Dispatchers.IO) {
        val path = if (permalink.startsWith("http")) permalink else BASE + permalink
        val sep = if (path.endsWith("/")) "" else "/"
        val url = "$path$sep.json?raw_json=1&limit=200&sort=confidence"
        RedditParser.parsePostWithComments(client.getJson(url))
    }

    suspend fun search(
        query: String,
        subreddit: String? = null,
        sort: String = "relevance",
        time: String = "all",
        after: String? = null,
    ): Listing<RedditPost> = withContext(Dispatchers.IO) {
        val q = URLEncoder.encode(query.trim(), "UTF-8")
        val url = buildString {
            append(BASE)
            if (!subreddit.isNullOrBlank()) append("/r/").append(subreddit.trim())
            append("/search.json?q=").append(q)
            append("&sort=").append(sort)
            append("&t=").append(time)
            append("&type=link&raw_json=1&include_over_18=on&limit=50")
            if (!subreddit.isNullOrBlank()) append("&restrict_sr=on")
            if (!after.isNullOrEmpty()) append("&after=").append(after)
        }
        RedditParser.parseListing(client.getJson(url))
    }

    companion object {
        const val BASE = "https://www.reddit.com"
        const val DEFAULT_SUB = "all"
    }
}
