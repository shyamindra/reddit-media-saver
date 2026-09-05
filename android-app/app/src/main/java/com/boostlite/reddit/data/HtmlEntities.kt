package com.boostlite.reddit.data

/**
 * Decode HTML entities in Reddit titles/bodies. [raw_json=1] usually prevents
 * this, but listings still ship named and numeric entities (often double-encoded).
 */
object HtmlEntities {

    private val named = mapOf(
        "amp" to "&",
        "lt" to "<",
        "gt" to ">",
        "quot" to "\"",
        "apos" to "'",
        "nbsp" to " ",
        "mdash" to "\u2014",
        "ndash" to "\u2013",
        "lsquo" to "'",
        "rsquo" to "'",
        "ldquo" to "\"",
        "rdquo" to "\"",
        "hellip" to "\u2026",
    )

    fun decode(raw: String): String {
        var out = raw
        repeat(3) {
            val next = decodeOnce(out)
            if (next == out) return normalize(next)
            out = next
        }
        return normalize(out)
    }

    private fun decodeOnce(s: String): String {
        val sb = StringBuilder(s.length)
        var i = 0
        while (i < s.length) {
            if (s[i] == '&') {
                val semi = s.indexOf(';', i + 1)
                if (semi in (i + 2)..(i + 12)) {
                    val ent = s.substring(i + 1, semi)
                    val replacement = valueOf(ent)
                    if (replacement != null) {
                        sb.append(replacement)
                        i = semi + 1
                        continue
                    }
                }
            }
            sb.append(s[i])
            i++
        }
        return sb.toString()
    }

    private fun valueOf(ent: String): String? {
        if (ent.startsWith("#x") || ent.startsWith("#X")) {
            val hex = ent.substring(2)
            val cp = hex.toIntOrNull(16) ?: return null
            return codePoint(cp)
        }
        if (ent.startsWith("#")) {
            val dec = ent.substring(1).toIntOrNull() ?: return null
            return codePoint(dec)
        }
        return named[ent]
    }

    private fun codePoint(cp: Int): String? {
        if (cp <= 0 || cp > 0x10FFFF) return null
        if (cp == 0xA0 || cp == 0x202F || cp == 0x2007) return " "
        if (cp == 0x2018 || cp == 0x2019 || cp == 0x201B || cp == 0x2032) return "'"
        if (cp == 0x201C || cp == 0x201D) return "\""
        return String(Character.toChars(cp))
    }

    private fun normalize(s: String): String {
        val sb = StringBuilder(s.length)
        for (ch in s) {
            when (ch) {
                '\u2018', '\u2019', '\u201A', '\u201B', '\u2032', '\u00B4', '\u02BC', '`' -> sb.append('\'')
                '\u201C', '\u201D', '\u201E' -> sb.append('"')
                '\u00A0', '\u202F', '\u2007', '\u2009', '\u200A' -> sb.append(' ')
                '\u200B', '\u200C', '\u200D', '\uFEFF' -> Unit
                else -> sb.append(ch)
            }
        }
        return contractionSpace.replace(sb.toString(), "$1'$2")
    }

    private val contractionSpace = Regex("([A-Za-z])' +([a-z])")
}
