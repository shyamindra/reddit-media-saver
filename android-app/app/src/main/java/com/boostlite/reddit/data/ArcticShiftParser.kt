package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.Listing
import com.boostlite.reddit.data.model.ProfileComment
import com.boostlite.reddit.data.model.RedditPost
import org.json.JSONArray
import org.json.JSONObject

/**
 * Maps Arctic Shift search payloads into the same domain types as live Reddit listings.
 */
object ArcticShiftParser {

    fun parsePosts(json: String): Listing<RedditPost> {
        val array = dataArray(json)
        val children = JSONArray()
        for (i in 0 until array.length()) {
            val obj = array.optJSONObject(i) ?: continue
            children.put(JSONObject().put("kind", "t3").put("data", obj))
        }
        val wrapped = JSONObject().put("data", JSONObject().put("children", children))
        val kept = RedditParser.parseListing(wrapped.toString()).items.filter { it.permalink.isNotBlank() }
        return Listing(kept, archiveAfter(kept.lastOrNull()?.createdUtc))
    }

    fun parseComments(json: String): Listing<ProfileComment> {
        val array = dataArray(json)
        val comments = (0 until array.length()).mapNotNull { i ->
            val obj = array.optJSONObject(i) ?: return@mapNotNull null
            RedditParser.parseProfileComment(obj)
        }
        return Listing(comments, archiveAfter(comments.lastOrNull()?.createdUtc))
    }

    private fun archiveAfter(createdUtc: Long?): String? =
        createdUtc?.takeIf { it > 0 }?.toString()

    private fun dataArray(json: String): JSONArray {
        val trimmed = json.trim()
        if (trimmed.startsWith("[")) return JSONArray(trimmed)
        return JSONObject(trimmed).optJSONArray("data") ?: JSONArray()
    }
}
