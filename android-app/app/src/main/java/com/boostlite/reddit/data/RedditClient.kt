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
 * Thin OkHttp wrapper that attaches the imported reddit.com cookies and a
 * desktop User-Agent to every request, then returns the raw response body.
 *
 * This mirrors the desktop tool's approach (Cookie header + browser UA against
 * the `.json` endpoints) — the only authenticated path Reddit still allows for
 * unofficial clients.
 */
class RedditClient(private val cookieStore: CookieStore) {

    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val cookie = cookieStore.currentHeader()
            val builder: Request.Builder = chain.request().newBuilder()
                .header("User-Agent", DESKTOP_UA)
                .header("Accept", "application/json, text/plain, */*")
                .header("Accept-Language", "en-US,en;q=0.9")
            if (cookie.isNotEmpty()) {
                builder.header("Cookie", cookie)
            }
            chain.proceed(builder.build())
        }
        .build()

    /** GET a JSON endpoint and return the body as a String, or throw on failure. */
    @Throws(IOException::class)
    fun getJson(url: String): String {
        val request = Request.Builder().url(url).get().build()
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
    }
}
