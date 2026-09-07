package com.boostlite.reddit.ui.media

private val IMAGE_EXT = listOf(".jpg", ".jpeg", ".png", ".webp", ".gif")
private val HEIGHT_TOKEN = Regex("(DASH|CMAF)_(\\d+)", RegexOption.IGNORE_CASE)

internal const val FEED_MAX_STILL_EDGE = 1080
internal const val FEED_MAX_VIDEO_HEIGHT = 720

internal fun feedStillDecodeSize(displayWidthPx: Int, capPx: Int = FEED_MAX_STILL_EDGE): Int =
    displayWidthPx.coerceAtLeast(1).coerceAtMost(capPx)

internal fun isProgressiveMp4(url: String): Boolean {
    val path = url.substringBefore('?').substringBefore('#').lowercase()
    return path.endsWith(".mp4")
}

internal fun isStillImageUrl(url: String): Boolean {
    val path = url.substringBefore('?').substringBefore('#').lowercase()
    return IMAGE_EXT.any { path.endsWith(it) }
}

internal fun capProgressiveFeedUrl(url: String, maxHeight: Int = FEED_MAX_VIDEO_HEIGHT): String {
    val match = HEIGHT_TOKEN.find(url) ?: return url
    val height = match.groupValues[2].toIntOrNull() ?: return url
    if (height <= maxHeight) return url
    return url.replace(HEIGHT_TOKEN, "${match.groupValues[1]}_$maxHeight")
}

internal fun feedStreamUrl(videoUrl: String?, downloadUrl: String?): String? {
    val progressive = downloadUrl?.takeIf { isProgressiveMp4(it) }
    if (progressive != null) return capProgressiveFeedUrl(progressive)
    return videoUrl
}

internal fun fullscreenImageUrl(previewUrl: String?, downloadUrl: String?): String? {
    if (downloadUrl != null && isStillImageUrl(downloadUrl)) return downloadUrl
    return previewUrl
}
