package com.boostlite.reddit.data

object BookmarkNames {
    const val MAX_STARRED = 20

    data class ToggleResult(val names: List<String>, val starred: Boolean)

    fun normalize(raw: String): String? {
        var s = raw.trim()
        if (s.startsWith("/r/", ignoreCase = true)) s = s.substring(3)
        else if (s.startsWith("r/", ignoreCase = true)) s = s.substring(2)
        else if (s.startsWith("/")) s = s.substring(1)
        s = s.trim()
        if (s.isEmpty()) return null
        if (s.equals("all", ignoreCase = true) || s.equals("frontpage", ignoreCase = true)) return null
        return s
    }

    fun isStarred(names: List<String>, raw: String): Boolean {
        val n = normalize(raw) ?: return false
        return names.any { it.equals(n, ignoreCase = true) }
    }

    fun add(names: List<String>, raw: String): Pair<Boolean, List<String>> {
        val n = normalize(raw) ?: return false to names
        if (isStarred(names, n)) return false to names
        if (names.size >= MAX_STARRED) return false to names
        return true to names + n
    }

    fun remove(names: List<String>, raw: String): List<String> {
        val n = normalize(raw) ?: return names
        return names.filterNot { it.equals(n, ignoreCase = true) }
    }

    fun toggle(names: List<String>, raw: String): ToggleResult {
        return if (isStarred(names, raw)) {
            ToggleResult(remove(names, raw), starred = false)
        } else {
            val (_, next) = add(names, raw)
            ToggleResult(next, starred = isStarred(next, raw))
        }
    }

    fun joinedForFeed(names: List<String>): String? {
        val slice = names.take(MAX_STARRED)
        return slice.takeIf { it.isNotEmpty() }?.joinToString("+")
    }
}
