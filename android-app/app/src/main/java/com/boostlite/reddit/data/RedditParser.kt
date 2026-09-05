package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.Listing
import com.boostlite.reddit.data.model.MediaType
import com.boostlite.reddit.data.model.PostMedia
import com.boostlite.reddit.data.model.RedditComment
import com.boostlite.reddit.data.model.RedditPost
import com.boostlite.reddit.data.model.Subreddit
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

    private fun pathWithoutQuery(url: String): String =
        url.substringBefore('?').substringBefore('#')

    private fun hasImageExt(url: String): Boolean {
        val path = pathWithoutQuery(url).lowercase()
        return IMAGE_EXT.any { path.endsWith(it) }
    }

    private val DASH_HEIGHTS = intArrayOf(1080, 720, 480, 360, 270, 240, 220, 96)

    /**
     * Reddit listing thumbs often live on preview.redd.it with width=/format=.
     * Hosted originals are i.redd.it without those resize params.
     */
    internal fun bestRedditImageUrl(raw: String): String {
        val decoded = decode(raw.trim())
        val base = pathWithoutQuery(decoded)
        val host = hostOf(base)
        if (host.equals("preview.redd.it", ignoreCase = true) ||
            host.equals("i.redd.it", ignoreCase = true)
        ) {
            val file = base.substringAfterLast('/')
            if (file.isNotEmpty()) return "https://i.redd.it/$file"
        }
        return decoded
    }

    private fun hostOf(url: String): String {
        val afterScheme = url.substringAfter("://", missingDelimiterValue = "")
        return afterScheme.substringBefore('/')
    }

    private fun stripResizeParams(raw: String): String {
        val decoded = decode(raw.trim())
        val base = pathWithoutQuery(decoded)
        val query = decoded.substringAfter('?', "")
        if (query.isEmpty()) return decoded
        val kept = query.split('&').filter { part ->
            val key = part.substringBefore('=').lowercase()
            key !in setOf("width", "height", "crop", "format", "auto")
        }
        return if (kept.isEmpty()) base else "$base?${kept.joinToString("&")}"
    }

    private fun rewriteDashHeight(fallback: String, height: Int): String {
        if (height <= 0) return fallback
        val snapped = DASH_HEIGHTS.firstOrNull { it <= height } ?: height
        return fallback.replace(Regex("DASH_\\d+"), "DASH_$snapped")
    }

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

    fun parseSubredditListing(json: String): Listing<Subreddit> {
        val root = JSONObject(json).optJSONObject("data") ?: return Listing(emptyList(), null)
        val children = root.optJSONArray("children") ?: JSONArray()
        val subs = ArrayList<Subreddit>(children.length())
        for (i in 0 until children.length()) {
            val child = children.optJSONObject(i) ?: continue
            if (child.optString("kind") != "t5") continue
            val data = child.optJSONObject("data") ?: continue
            val name = data.optString("display_name").trim()
            if (name.isEmpty()) continue
            subs.add(
                Subreddit(
                    name = name,
                    title = data.optString("title"),
                    subscribers = data.optInt("subscribers"),
                    over18 = data.optBoolean("over_18"),
                    publicDescription = HtmlEntities.decode(data.optString("public_description")),
                ),
            )
        }
        return Listing(subs, root.optStringOrNull("after"))
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
            val body = HtmlEntities.decode(data.optString("body")).trim()
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
            title = HtmlEntities.decode(data.optString("title")),
            author = data.optString("author", "[deleted]"),
            subreddit = data.optString("subreddit"),
            permalink = permalink,
            linkUrl = data.optStringOrNull("url_overridden_by_dest") ?: data.optStringOrNull("url"),
            score = data.optInt("score"),
            numComments = data.optInt("num_comments"),
            createdUtc = data.optLong("created_utc"),
            over18 = data.optBoolean("over_18"),
            domain = data.optStringOrNull("domain"),
            selftext = data.optStringOrNull("selftext")?.let { HtmlEntities.decode(it) },
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
            return videoMedia(redditVideo, data, isGif = redditVideo.optBoolean("is_gif"))
        }

        val url = (data.optStringOrNull("url_overridden_by_dest") ?: data.optStringOrNull("url"))
            ?.let { decode(it) }
        val hint = data.optString("post_hint")

        // 3. Direct image (gifs are handled below so we can prefer mp4/DASH)
        if (url != null && (hint == "image" || hasImageExt(url)) && !isGifPath(url)) {
            val best = bestRedditImageUrl(url)
            return PostMedia(MediaType.IMAGE, previewUrl = best, downloadUrl = best)
        }

        // 4. GIFV / Imgur GIF — original mp4 is better than Reddit's transcode
        if (url != null && pathWithoutQuery(url).lowercase().endsWith(".gifv")) {
            val mp4 = pathWithoutQuery(url).dropLast(5) + ".mp4"
            return PostMedia(
                type = MediaType.VIDEO,
                previewUrl = previewImage(data),
                videoUrl = mp4,
                downloadUrl = mp4,
                isGif = true,
            )
        }
        siblingMp4(url)?.let { mp4 ->
            return PostMedia(
                type = MediaType.VIDEO,
                previewUrl = previewImage(data),
                videoUrl = mp4,
                downloadUrl = mp4,
                isGif = true,
            )
        }

        embedVideo(data, url, hint)?.let { return it }

        // 5. GIF bytes when there is no playable transcode
        if (url != null && pathWithoutQuery(url).lowercase().endsWith(".gif")) {
            val best = bestRedditImageUrl(url)
            return PostMedia(MediaType.GIF, previewUrl = best, downloadUrl = best, isGif = true)
        }

        // 6. Rich video embeds we could not play — keep as a link
        if (hint == "rich:video" || hint == "hosted:video") {
            return PostMedia(MediaType.LINK, previewUrl = previewImage(data), downloadUrl = url)
        }

        // 7. Self / text
        val self = data.optStringOrNull("selftext")
        if (data.optBoolean("is_self") || (!self.isNullOrBlank())) {
            return PostMedia(MediaType.TEXT, previewUrl = previewImage(data))
        }

        // 8. External link
        if (url != null) {
            val preview = previewImage(data)
            return PostMedia(MediaType.LINK, previewUrl = preview, downloadUrl = url)
        }

        return PostMedia(MediaType.NONE)
    }

    private fun videoMedia(video: JSONObject, data: JSONObject, isGif: Boolean): PostMedia {
        val dash = video.optStringOrNull("dash_url")?.let { decode(it) }
        val hls = video.optStringOrNull("hls_url")?.let { decode(it) }
        val fallback = video.optStringOrNull("fallback_url")?.let { decode(it) }
        val height = video.optInt("height")
        val download = fallback?.let { rewriteDashHeight(it, height) }
        val stream = when {
            height > 0 && download != null -> download
            dash != null -> dash
            hls != null -> hls
            else -> download
        }
        return PostMedia(
            type = MediaType.VIDEO,
            previewUrl = previewImage(data),
            videoUrl = stream,
            downloadUrl = download ?: stream,
            isGif = isGif || video.optBoolean("is_gif"),
        )
    }

    private fun embedVideo(data: JSONObject, url: String?, hint: String): PostMedia? {
        val gifHost = isGifHost(url, data)
        val previewVid = data.optJSONObject("preview")?.optJSONObject("reddit_video_preview")
        if (previewVid != null && (gifHost || hint == "rich:video" || hint == "hosted:video" || previewVid.optBoolean("is_gif"))) {
            return videoMedia(previewVid, data, isGif = true)
        }
        val mp4 = variantMp4(data)
        if (mp4 != null && (gifHost || hint == "rich:video")) {
            return PostMedia(
                type = MediaType.VIDEO,
                previewUrl = previewImage(data),
                videoUrl = mp4,
                downloadUrl = mp4,
                isGif = true,
            )
        }
        return null
    }

    private fun variantMp4(data: JSONObject): String? {
        val images = data.optJSONObject("preview")?.optJSONArray("images") ?: return null
        if (images.length() == 0) return null
        val mp4 = images.getJSONObject(0).optJSONObject("variants")?.optJSONObject("mp4") ?: return null
        var bestUrl: String? = null
        var bestArea = -1
        fun consider(node: JSONObject?) {
            if (node == null) return
            val url = node.optStringOrNull("url") ?: return
            val area = node.optInt("width") * node.optInt("height")
            if (area >= bestArea) {
                bestArea = area
                bestUrl = url
            }
        }
        consider(mp4.optJSONObject("source"))
        val resolutions = mp4.optJSONArray("resolutions")
        if (resolutions != null) {
            for (i in 0 until resolutions.length()) {
                consider(resolutions.optJSONObject(i))
            }
        }
        return bestUrl?.let { stripResizeParams(it) }
    }

    private fun isGifHost(url: String?, data: JSONObject): Boolean {
        val domain = data.optString("domain").lowercase()
        val u = (url ?: "").lowercase()
        val hosts = listOf("redgifs.com", "gfycat.com", "gifdeliverynetwork.com", "giphy.com")
        if (hosts.any { domain.contains(it) || u.contains(it) }) return true
        return u.contains(".gif")
    }

    private fun isGifPath(url: String): Boolean {
        val path = pathWithoutQuery(url).lowercase()
        return path.endsWith(".gif") || path.endsWith(".gifv")
    }

    /** Imgur (and similar) expose a same-path .mp4 next to the .gif. */
    private fun siblingMp4(url: String?): String? {
        if (url == null || !pathWithoutQuery(url).lowercase().endsWith(".gif")) return null
        val host = hostOf(pathWithoutQuery(url)).lowercase()
        if ("imgur.com" !in host && "giphy.com" !in host) return null
        return pathWithoutQuery(url).dropLast(4) + ".mp4"
    }

    private fun parseGallery(data: JSONObject): List<String> {
        val order = data.optJSONObject("gallery_data")?.optJSONArray("items") ?: return emptyList()
        val meta = data.optJSONObject("media_metadata") ?: return emptyList()
        val urls = ArrayList<String>(order.length())
        for (i in 0 until order.length()) {
            val mediaId = order.getJSONObject(i).optString("media_id")
            val entry = meta.optJSONObject(mediaId) ?: continue
            val url = galleryItemUrl(mediaId, entry) ?: continue
            urls.add(url)
        }
        return urls
    }

    private fun galleryItemUrl(mediaId: String, entry: JSONObject): String? {
        val source = entry.optJSONObject("s") ?: return null
        val mp4 = source.optStringOrNull("mp4")
        if (mp4 != null) return stripResizeParams(mp4)
        val gif = source.optStringOrNull("gif")
        if (gif != null) return bestRedditImageUrl(gif)
        val u = source.optStringOrNull("u") ?: return null
        if (mediaId.isNotBlank()) {
            val mime = entry.optString("m")
            val ext = extFromMime(mime, u)
            return "https://i.redd.it/$mediaId.$ext"
        }
        return bestRedditImageUrl(u)
    }

    private fun extFromMime(mime: String, fallbackUrl: String): String {
        val m = mime.lowercase()
        return when {
            "png" in m -> "png"
            "gif" in m -> "gif"
            "webp" in m -> "webp"
            "jpeg" in m || "jpg" in m -> "jpg"
            else -> {
                val file = pathWithoutQuery(decode(fallbackUrl)).substringAfterLast('/')
                file.substringAfterLast('.', "jpg").ifBlank { "jpg" }
            }
        }
    }

    private fun previewImage(data: JSONObject): String? {
        val images = data.optJSONObject("preview")?.optJSONArray("images") ?: return null
        if (images.length() == 0) return null
        val img = images.getJSONObject(0)
        var bestUrl: String? = null
        var bestArea = -1
        fun consider(node: JSONObject?) {
            if (node == null) return
            val url = node.optStringOrNull("url") ?: return
            val area = node.optInt("width") * node.optInt("height")
            if (area >= bestArea) {
                bestArea = area
                bestUrl = url
            }
        }
        consider(img.optJSONObject("source"))
        val resolutions = img.optJSONArray("resolutions")
        if (resolutions != null) {
            for (i in 0 until resolutions.length()) {
                consider(resolutions.optJSONObject(i))
            }
        }
        return bestUrl?.let { bestRedditImageUrl(it) }
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
