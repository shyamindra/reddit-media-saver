package com.boostlite.reddit.data

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit

/** Raised when Reddit rejects the request because the session is missing/expired. */
class SessionExpiredException(message: String) : IOException(message)

/** Raised on 429 so callers can surface a "slow down" message. */
class RateLimitedException(message: String) : IOException(message)

/**
 * Authenticated HTTP: Cookie + desktop User-Agent on every Reddit request.
 * JSON fetch, Coil, and Save downloads share [authHeaders] / [http].
 */
class RedditClient(private val cookieStore: CookieStore) {

    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val builder = chain.request().newBuilder()
            for ((name, value) in authHeaders(cookieStore.currentHeader())) {
                builder.header(name, value)
            }
            chain.proceed(builder.build())
        }
        .build()

    /** Headers for callers that are not OkHttp (system DownloadManager). */
    fun authHeaders(): Map<String, String> = authHeaders(cookieStore.currentHeader())

    /** GET a JSON endpoint and return the body as a String, or throw on failure. */
    @Throws(IOException::class)
    fun getJson(url: String): String {
        val request = Request.Builder()
            .url(url)
            .header("Accept", "application/json, text/plain, */*")
            .get()
            .build()
        http.newCall(request).execute().use { response: Response ->
            when {
                response.isSuccessful -> {
                    return response.body?.string()
                        ?: throw IOException("Empty response body from $url")
                }
                response.code == 401 || response.code == 403 ->
                    throw SessionExpiredException(
                        "Reddit returned ${response.code}. Your cookies are missing or expired — re-import from Firefox.",
                    )
                response.code == 429 ->
                    throw RateLimitedException("Rate limited (429). Wait a bit before continuing.")
                else ->
                    throw IOException("HTTP ${response.code} for $url")
            }
        }
    }

    companion object {
        const val DESKTOP_UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0"

        fun authHeaders(cookieHeader: String): Map<String, String> {
            val headers = linkedMapOf(
                "User-Agent" to DESKTOP_UA,
                "Accept-Language" to "en-US,en;q=0.9",
            )
            if (cookieHeader.isNotEmpty()) {
                headers["Cookie"] = cookieHeader
            }
            return headers
        }
    }
}
