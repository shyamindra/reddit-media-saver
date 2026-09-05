package com.boostlite.reddit.download

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.widget.Toast
import com.boostlite.reddit.data.RedditClient

/**
 * Downloads a media URL into the public Downloads/BoostLite folder using the
 * system DownloadManager (gives a notification + resumability for free).
 *
 * Note: v.redd.it videos have separate audio tracks; this prototype downloads
 * the video track only. Muxing audio would need ffmpeg/mp4parser (follow-up).
 */
class MediaDownloader(
    private val appContext: Context,
    private val redditClient: RedditClient,
) {

    fun enqueue(url: String, subreddit: String, title: String) {
        val fileName = buildFileName(url, subreddit, title)
        val request = DownloadManager.Request(Uri.parse(url)).apply {
            setTitle(fileName)
            setDescription("BoostLite download")
            for ((name, value) in redditClient.authHeaders()) {
                addRequestHeader(name, value)
            }
            setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            setDestinationInExternalPublicDir(
                Environment.DIRECTORY_DOWNLOADS,
                "BoostLite/$fileName",
            )
            setAllowedOverMetered(true)
            setAllowedOverRoaming(true)
        }
        val manager = appContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        manager.enqueue(request)
        Toast.makeText(appContext, "Downloading $fileName", Toast.LENGTH_SHORT).show()
    }

    private fun buildFileName(url: String, subreddit: String, title: String): String {
        val ext = extensionFromUrl(url)
        val safeTitle = title.take(60).replace(Regex("[^A-Za-z0-9._-]+"), "_").trim('_')
        val safeSub = subreddit.replace(Regex("[^A-Za-z0-9._-]+"), "_")
        val stamp = System.currentTimeMillis()
        return "${safeTitle.ifBlank { "media" }}_${safeSub}_$stamp.$ext"
    }
}

internal fun extensionFromUrl(url: String): String {
    val noQuery = url.substringBefore('?')
    val host = runCatching { java.net.URI(noQuery).host.orEmpty() }.getOrDefault("")
    val lastSegment = noQuery.substringAfterLast('/')
    val ext = lastSegment.substringAfterLast('.', missingDelimiterValue = "")
    val valid = ext.length in 2..5 && ext.all { it.isLetterOrDigit() }
    return when {
        valid -> ext.lowercase()
        host.contains("v.redd.it") -> "mp4"
        host.contains("i.redd.it") -> "jpg"
        else -> "bin"
    }
}
