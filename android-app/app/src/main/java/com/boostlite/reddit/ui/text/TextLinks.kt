package com.boostlite.reddit.ui.text

import java.net.URI

data class TextLink(val start: Int, val end: Int, val url: String)

data class LinkedText(val text: String, val links: List<TextLink>)

sealed class RedditInApp {
    data class Sub(val name: String) : RedditInApp()
    data class User(val name: String) : RedditInApp()
}

private val MARKDOWN_LINK = Regex("""\[([^\]\n]+)]\(([^)\s]+)\)""")
private val BARE_URL = Regex("""https?://[^\s<>\[\]()]+""")

fun linkify(input: String): LinkedText {
    data class Hit(val start: Int, val end: Int, val display: String, val url: String)

    val hits = ArrayList<Hit>()
    for (match in MARKDOWN_LINK.findAll(input)) {
        val url = resolveUrl(match.groupValues[2]) ?: continue
        hits += Hit(match.range.first, match.range.last + 1, match.groupValues[1], url)
    }
    for (match in BARE_URL.findAll(input)) {
        if (hits.any { it.start < match.range.last + 1 && match.range.first < it.end }) continue
        val raw = trimTrailingPunct(match.value)
        val url = resolveUrl(raw) ?: continue
        hits += Hit(match.range.first, match.range.first + raw.length, raw, url)
    }
    hits.sortBy { it.start }

    val out = StringBuilder()
    val links = ArrayList<TextLink>()
    var cursor = 0
    for (hit in hits) {
        if (hit.start < cursor) continue
        out.append(input, cursor, hit.start)
        val start = out.length
        out.append(hit.display)
        links += TextLink(start, out.length, hit.url)
        cursor = hit.end
    }
    if (cursor < input.length) out.append(input, cursor, input.length)
    return LinkedText(out.toString(), links)
}

fun redditInApp(url: String): RedditInApp? {
    val uri = runCatching { URI(url) }.getOrNull() ?: return null
    if (uri.host?.lowercase() !in setOf("reddit.com", "www.reddit.com")) return null
    val parts = uri.path.orEmpty().split('/').filter { it.isNotEmpty() }
    if (parts.size < 2) return null
    return when (parts[0].lowercase()) {
        "r" -> RedditInApp.Sub(parts[1])
        "u", "user" -> RedditInApp.User(parts[1])
        else -> null
    }
}

private fun trimTrailingPunct(url: String): String = url.trimEnd { it in ".,;:!?" }

private fun resolveUrl(raw: String): String? {
    val url = raw.trim()
    if (url.isEmpty()) return null
    return when {
        url.startsWith("https://") || url.startsWith("http://") -> url
        url.startsWith("/r/") || url.startsWith("/u/") || url.startsWith("/user/") ->
            "https://www.reddit.com$url"
        url.startsWith("www.") -> "https://$url"
        else -> null
    }
}
