package com.boostlite.reddit.ui

/** Compact "3h", "2d", "5mo" style relative time from a UTC-seconds timestamp. */
fun relativeTime(createdUtcSeconds: Long): String {
    if (createdUtcSeconds <= 0) return ""
    val nowSec = System.currentTimeMillis() / 1000
    val diff = (nowSec - createdUtcSeconds).coerceAtLeast(0)
    return when {
        diff < 60 -> "${diff}s"
        diff < 3600 -> "${diff / 60}m"
        diff < 86_400 -> "${diff / 3600}h"
        diff < 2_592_000 -> "${diff / 86_400}d"
        diff < 31_536_000 -> "${diff / 2_592_000}mo"
        else -> "${diff / 31_536_000}y"
    }
}

/** "12.3k" style score formatting. */
fun compactCount(n: Int): String = when {
    n < 1000 -> n.toString()
    n < 1_000_000 -> String.format("%.1fk", n / 1000.0)
    else -> String.format("%.1fm", n / 1_000_000.0)
}
