package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.FeedSort
import com.boostlite.reddit.data.model.Listing
import com.boostlite.reddit.data.model.RedditPost
import com.boostlite.reddit.data.model.Subreddit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

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
        val url = RedditUrls.feed(subreddit, sort.path, time, after)
        RedditParser.parseListing(client.getJson(url))
    }

    suspend fun userSubmitted(
        name: String,
        sort: FeedSort,
        time: String = "all",
        after: String? = null,
    ): Listing<RedditPost> = withContext(Dispatchers.IO) {
        val url = RedditUrls.userSubmitted(name, sort.path, time, after)
        RedditParser.parseListing(client.getJson(url))
    }

    suspend fun postWithComments(
        permalink: String,
    ): RedditParser.PostWithComments = withContext(Dispatchers.IO) {
        val path = if (permalink.startsWith("http")) permalink else RedditUrls.BASE + permalink
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
        val url = RedditUrls.searchPosts(query, subreddit, sort, time, after)
        RedditParser.parseListing(client.getJson(url))
    }

    suspend fun searchSubreddits(query: String): Listing<Subreddit> = withContext(Dispatchers.IO) {
        RedditParser.parseSubredditListing(client.getJson(RedditUrls.searchSubreddits(query)))
    }
}
