package com.boostlite.reddit.data

/**
 * Turns raw cookie input into a single `Cookie:` header value for reddit.com.
 *
 * Accepts two formats:
 *  1. A browser cookie string: `name1=value1; name2=value2` (what you get from
 *     `document.cookie` in the Firefox console, or from a copy button).
 *  2. A Netscape `cookies.txt` file (tab-separated), e.g. exported by the
 *     "Cookie Manager" / "Export Cookies" Firefox add-ons or yt-dlp.
 *
 * Only reddit.com cookies are kept. Expired entries (Netscape format only,
 * where an expiry is available) are dropped.
 */
object CookieParser {

    private const val NETSCAPE_COLUMNS = 7

    fun parse(raw: String): String {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) return ""
        return if (looksLikeNetscape(trimmed)) {
            parseNetscape(trimmed)
        } else {
            parseHeaderString(trimmed)
        }
    }

    private fun looksLikeNetscape(raw: String): Boolean {
        // Netscape files start with a comment header or contain tab-separated rows.
        return raw.startsWith("# Netscape") ||
            raw.startsWith("# HTTP Cookie File") ||
            raw.lineSequence().any { it.contains('\t') && it.split('\t').size >= NETSCAPE_COLUMNS }
    }

    private fun parseHeaderString(raw: String): String {
        val pairs = raw.split(';')
            .map { it.trim() }
            .filter { it.contains('=') && it.isNotBlank() }
        return dedupe(pairs)
    }

    private fun parseNetscape(raw: String): String {
        val nowSeconds = System.currentTimeMillis() / 1000
        val pairs = mutableListOf<String>()

        for (line in raw.lineSequence()) {
            if (line.isBlank()) continue
            // "#HttpOnly_" prefixed lines are real cookies; other comments are not.
            val normalized = line.removePrefix("#HttpOnly_")
            if (normalized.startsWith("#")) continue

            val parts = normalized.split('\t')
            if (parts.size < NETSCAPE_COLUMNS) continue

            val domain = parts[0]
            val expiry = parts[4].toLongOrNull()
            val name = parts[5]
            val value = parts.subList(6, parts.size).joinToString("\t")

            if (!domain.contains("reddit.com", ignoreCase = true)) continue
            if (name.isBlank()) continue
            if (expiry != null && expiry in 1 until nowSeconds) continue

            pairs.add("$name=$value")
        }
        return dedupe(pairs)
    }

    /** Keep the last occurrence of each cookie name, preserving order. */
    private fun dedupe(pairs: List<String>): String {
        val byName = LinkedHashMap<String, String>()
        for (pair in pairs) {
            val name = pair.substringBefore('=').trim()
            if (name.isEmpty()) continue
            byName[name] = pair.trim()
        }
        return byName.values.joinToString("; ")
    }

    /** True if the parsed header contains a plausible Reddit session cookie. */
    fun hasSession(header: String): Boolean {
        val names = header.split(';').map { it.substringBefore('=').trim().lowercase() }
        return names.any { it == "reddit_session" || it == "token_v2" || it == "loid" }
    }
}
