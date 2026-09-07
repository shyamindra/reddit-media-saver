package com.boostlite.reddit.data

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Unauthenticated JSON GET for Arctic Shift. Never attach Reddit cookies.
 */
class ArchiveClient(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build(),
) {
    @Throws(IOException::class)
    fun getJson(url: String): String {
        val request = Request.Builder()
            .url(url)
            .header("Accept", "application/json")
            .header("User-Agent", "BoostLite/1.0")
            .get()
            .build()
        http.newCall(request).execute().use { response: Response ->
            when {
                response.isSuccessful -> {
                    return response.body?.string()
                        ?: throw IOException("Archive unavailable. Try again.")
                }
                response.code == 429 ->
                    throw RateLimitedException("Archive unavailable. Try again.")
                else ->
                    throw IOException("Archive unavailable. Try again.")
            }
        }
    }
}
