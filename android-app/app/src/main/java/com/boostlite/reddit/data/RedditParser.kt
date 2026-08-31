package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.Listing
import com.boostlite.reddit.data.model.MediaType
import com.boostlite.reddit.data.model.PostMedia
import com.boostlite.reddit.data.model.RedditComment
import com.boostlite.reddit.data.model.RedditPost
import org.json.JSONArray
import org.json.JSONObject

/**
 * Parses Reddit's `.json` payloads into domain models using org.json.
 *
 * Reddit JSON is polymorphic and messy (mixed arrays, HTML-escaped URLs,
 * "more" comment stubs), so hand-parsing is more robust here than strict
 * reflection-based deserialization.
 */
object RedditParser {

    private val IMAGE_EXT = listOf(".jpg", ".jpeg", ".png", ".webp")

    // ---- Listings (feeds + search) ----

    fun parseListing(json: String): Listing<RedditPost> {
        val root = JSONObject(json).getJSONObject("data")
        val children = root.optJSONArray("children") ?: JSONArray()
        val posts = ArrayList<RedditPost>(children.length())
        for (i in 0 until children.length()) {
            val kind = children.getJSONObject(i).optString("kind")
            if (kind != "t3") continue
            val data = children.getJSONObject(i).optJSONObject("data") ?: continue
            posts.add(parsePost(data))
        }
        val after = root.optStringOrNull("after")
        return Listing(posts, after)
    }

    // ---- Post + comments (permalink.json returns [postListing, commentListing]) ----

    data class PostWithComments(val post: RedditPost, val comments: List<RedditComment>)

    fun parsePostWithComments(json: String): PostWithComments {
        val arr = JSONArray(json)
        val postData = arr.getJSONObject(0)
            .getJSONObject("data")
            .getJSONArray("children")
            .getJSONObject(0)
            .getJSONObject("data")
        val post = parsePost(postData)

        val comments = ArrayList<RedditComment>()
        if (arr.length() > 1) {
            val commentChildren = arr.getJSONObject(1)
                .getJSONObject("data")
                .optJSONArray("children") ?: JSONArray()
            flattenComments(commentChildren, 0, comments)
        }
        return PostWithComments(post, comments)
    }

    private fun flattenComments(children: JSONArray, depth: Int, out: MutableList<RedditComment>) {
        for (i in 0 until children.length()) {
            val node = children.getJSONObject(i)
            if (node.optString("kind") != "t1") continue // skip "more" stubs
            val data = node.optJSONObject("data") ?: continue
            val body = data.optString("body").trim()
            if (body.isNotEmpty()) {
                out.add(
                    RedditComment(
                        id = data.optString("id"),
                        author = data.optString("author", "[deleted]"),
                        body = body,
                        score = data.optInt("score"),
                        depth = depth,
                        createdUtc = data.optLong("created_utc"),
                    ),
                )
            }
            val replies = data.opt("replies")
            if (replies is JSONObject) {
                val replyChildren = replies.optJSONObject("data")?.optJSONArray("children")
                if (replyChildren != null) flattenComments(replyChildren, depth + 1, out)
            }
        }
    }

    // ---- Post ----

    private fun parsePost(data: JSONObject): RedditPost {
        val permalink = data.optString("permalink")
        return RedditPost(
            id = data.optString("id"),
            fullname = data.optString("name"),
            title = decode(data.optString("title")),
            author = data.optString("author", "[deleted]"),
            subreddit = data.optString("subreddit"),
            permalink = permalink,
            linkUrl = data.optStringOrNull("url_overridden_by_dest") ?: data.optStringOrNull("url"),
            score = data.optInt("score"),
            numComments = data.optInt("num_comments"),
            createdUtc = data.optLong("created_utc"),
            over18 = data.optBoolean("over_18"),
            domain = data.optStringOrNull("domain"),
            selftext = data.optStringOrNull("selftext")?.let { decode(it) },
            media = resolveMedia(data),
        )
    }

    // ---- Media resolution ----

    private fun resolveMedia(data: JSONObject): PostMedia {
        // 1. Gallery
        if (data.optBoolean("is_gallery")) {
            val urls = parseGallery(data)
            if (urls.isNotEmpty()) {
                return PostMedia(
                    type = MediaType.GALLERY,
                    previewUrl = urls.first(),
                    galleryUrls = urls,
                    downloadUrl = urls.first(),
                )
            }
        }

        // 2. Reddit-hosted video (v.redd.it)
        val redditVideo = data.optJSONObject("media")?.optJSONObject("reddit_video")
            ?: data.optJSONObject("secure_media")?.optJSONObject("reddit_video")
        if (redditVideo != null) {
            val dash = redditVideo.optStringOrNull("dash_url")
            val fallback = redditVideo.optStringOrNull("fallback_url")?.let { decode(it) }
            val stream = dash ?: fallback
            return PostMedia(
                type = MediaType.VIDEO,
                previewUrl = previewImage(data),
                videoUrl = stream,
                downloadUrl = fallback ?: stream,
            )
        }

        val url = (data.optStringOrNull("url_overridden_by_dest") ?: data.optStringOrNull("url"))
            ?.let { decode(it) }
        val hint = data.optString("post_hint")

        // 3. Direct image
        if (url != null && (hint == "image" || IMAGE_EXT.any { url.lowercase().endsWith(it) })) {
            return PostMedia(MediaType.IMAGE, previewUrl = url, downloadUrl = url)
        }

        // 4. GIF / GIFV
        if (url != null && url.lowercase().endsWith(".gif")) {
            return PostMedia(MediaType.GIF, previewUrl = url, downloadUrl = url)
        }
        if (url != null && url.lowercase().endsWith(".gifv")) {
            val mp4 = url.dropLast(5) + ".mp4"
            return PostMedia(MediaType.VIDEO, previewUrl = previewImage(data), videoUrl = mp4, downloadUrl = mp4)
        }

        // 5. Rich video embeds (redgifs / imgur / gfycat) — use preview, link out for now
        if (hint == "rich:video" || hint == "hosted:video") {
            return PostMedia(MediaType.LINK, previewUrl = previewImage(data), downloadUrl = url)
        }

        // 6. Self / text
        val self = data.optStringOrNull("selftext")
        if (data.optBoolean("is_self") || (!self.isNullOrBlank())) {
            return PostMedia(MediaType.TEXT, previewUrl = previewImage(data))
        }

        // 7. External link
        if (url != null) {
            val preview = previewImage(data)
            return PostMedia(MediaType.LINK, previewUrl = preview, downloadUrl = url)
        }

        return PostMedia(MediaType.NONE)
    }

    private fun parseGallery(data: JSONObject): List<String> {
        val order = data.optJSONObject("gallery_data")?.optJSONArray("items") ?: return emptyList()
        val meta = data.optJSONObject("media_metadata") ?: return emptyList()
        val urls = ArrayList<String>(order.length())
        for (i in 0 until order.length()) {
            val mediaId = order.getJSONObject(i).optString("media_id")
            val entry = meta.optJSONObject(mediaId) ?: continue
            // "s" holds the source; "u" is a resized url, "gif"/"mp4" for animated.
            val source = entry.optJSONObject("s") ?: continue
            val u = source.optStringOrNull("u") ?: source.optStringOrNull("gif") ?: source.optStringOrNull("mp4")
            if (u != null) urls.add(decode(u))
        }
        return urls
    }

    private fun previewImage(data: JSONObject): String? {
        val images = data.optJSONObject("preview")?.optJSONArray("images") ?: return null
        if (images.length() == 0) return null
        val source = images.getJSONObject(0).optJSONObject("source") ?: return null
        return source.optStringOrNull("url")?.let { decode(it) }
    }

    /** Reddit HTML-escapes ampersands in preview/media URLs. */
    private fun decode(s: String): String = s
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")

    private fun JSONObject.optStringOrNull(key: String): String? {
        if (!has(key) || isNull(key)) return null
        val v = optString(key)
        return v.ifBlank { null }
    }
}
