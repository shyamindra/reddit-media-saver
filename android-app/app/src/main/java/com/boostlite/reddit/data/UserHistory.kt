package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.FeedSort
import com.boostlite.reddit.data.model.HistoryPage
import com.boostlite.reddit.data.model.Listing
import com.boostlite.reddit.data.model.ProfileComment
import com.boostlite.reddit.data.model.RedditPost
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

fun interface JsonGetter {
    fun getJson(url: String): String
}

/**
 * Live Reddit user listings first; Arctic Shift only when that listing is empty.
 * Archive pagination uses a unix-seconds `after` cursor (not a Reddit fullname).
 */
class UserHistory(
    private val livePosts: suspend (name: String, sort: FeedSort, time: String, after: String?) -> Listing<RedditPost>,
    private val liveComments: suspend (name: String, sort: FeedSort, time: String, after: String?) -> Listing<ProfileComment>,
    private val archiveGet: JsonGetter,
) {
    suspend fun posts(
        name: String,
        sort: FeedSort,
        time: String,
        after: String?,
    ): HistoryPage<RedditPost> = withContext(Dispatchers.IO) {
        val archiveCursor = after?.toLongOrNull()
        if (archiveCursor != null) {
            return@withContext archivePosts(name, archiveCursor)
        }
        val live = livePosts(name, sort, time, after)
        if (live.items.isNotEmpty()) {
            return@withContext HistoryPage(live.items, live.after, fromArchive = false)
        }
        if (after != null) {
            return@withContext HistoryPage(emptyList(), null, fromArchive = false)
        }
        archivePosts(name, null)
    }

    suspend fun comments(
        name: String,
        sort: FeedSort,
        time: String,
        after: String?,
    ): HistoryPage<ProfileComment> = withContext(Dispatchers.IO) {
        val archiveCursor = after?.toLongOrNull()
        if (archiveCursor != null) {
            return@withContext archiveComments(name, archiveCursor)
        }
        val live = liveComments(name, sort, time, after)
        if (live.items.isNotEmpty()) {
            return@withContext HistoryPage(live.items, live.after, fromArchive = false)
        }
        if (after != null) {
            return@withContext HistoryPage(emptyList(), null, fromArchive = false)
        }
        archiveComments(name, null)
    }

    private fun archivePosts(name: String, beforeUtc: Long?): HistoryPage<RedditPost> {
        val listing = ArcticShiftParser.parsePosts(
            archiveGet.getJson(ArcticShiftUrls.posts(name, beforeUtc)),
        )
        return HistoryPage(listing.items, listing.after, fromArchive = true)
    }

    private fun archiveComments(name: String, beforeUtc: Long?): HistoryPage<ProfileComment> {
        val listing = ArcticShiftParser.parseComments(
            archiveGet.getJson(ArcticShiftUrls.comments(name, beforeUtc)),
        )
        return HistoryPage(listing.items, listing.after, fromArchive = true)
    }
}
