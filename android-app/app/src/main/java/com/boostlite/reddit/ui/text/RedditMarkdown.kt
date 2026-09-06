package com.boostlite.reddit.ui.text

enum class MdStyle { BOLD, ITALIC, STRIKE, CODE, HEADING, QUOTE, LIST }

data class MdSpan(val start: Int, val end: Int, val style: MdStyle)

data class FormattedRedditText(
    val text: String,
    val spans: List<MdSpan>,
    val links: List<TextLink>,
)

fun formatRedditText(input: String): FormattedRedditText {
    val linked = linkify(input)
    val source = linked.text
    val removed = BooleanArray(source.length)
    val sourceSpans = ArrayList<MdSpan>()

    fun overlapsLink(start: Int, end: Int): Boolean =
        linked.links.any { it.start < end && start < it.end }

    fun addInline(regex: Regex, style: MdStyle, markerLength: Int) {
        for (match in regex.findAll(source)) {
            val start = match.range.first
            val end = match.range.last + 1
            if (overlapsLink(start, end)) continue
            repeat(markerLength) { offset ->
                removed[start + offset] = true
                removed[end - markerLength + offset] = true
            }
            sourceSpans += MdSpan(start + markerLength, end - markerLength, style)
        }
    }

    addInline(Regex("""\*\*([^*]+)\*\*"""), MdStyle.BOLD, 2)
    addInline(Regex("""(?<!\*)\*(?![ \t])([^*\r\n]+)\*(?!\*)"""), MdStyle.ITALIC, 1)
    addInline(Regex("""_([^_]+)_"""), MdStyle.ITALIC, 1)
    addInline(Regex("""~~([^~]+)~~"""), MdStyle.STRIKE, 2)
    addInline(Regex("""`([^`]+)`"""), MdStyle.CODE, 1)

    val heading = Regex("""^#{1,3} (.+)$""", RegexOption.MULTILINE)
    for (match in heading.findAll(source)) {
        val start = match.range.first
        val end = match.range.last + 1
        val contentStart = match.groups[1]!!.range.first
        for (index in start until contentStart) removed[index] = true
        sourceSpans += MdSpan(contentStart, end, MdStyle.HEADING)
    }

    val quote = Regex("""^> (.+)$""", RegexOption.MULTILINE)
    for (match in quote.findAll(source)) {
        val start = match.range.first
        val end = match.range.last + 1
        val contentStart = match.groups[1]!!.range.first
        for (index in start until contentStart) removed[index] = true
        sourceSpans += MdSpan(contentStart, end, MdStyle.QUOTE)
    }

    val list = Regex("""^(?:[-*] |\d+\. ).+$""", RegexOption.MULTILINE)
    for (match in list.findAll(source)) {
        val start = match.range.first
        val end = match.range.last + 1
        sourceSpans += MdSpan(start, end, MdStyle.LIST)
    }

    val offsets = IntArray(source.length + 1)
    val text = buildString(source.length) {
        for (index in source.indices) {
            offsets[index] = length
            if (!removed[index]) append(source[index])
        }
        offsets[source.length] = length
    }
    val spans = sourceSpans
        .map { MdSpan(offsets[it.start], offsets[it.end], it.style) }
        .filter { it.start < it.end }
        .sortedWith(compareBy<MdSpan> { it.start }.thenBy { it.end })
    val links = linked.links.map {
        TextLink(offsets[it.start], offsets[it.end], it.url)
    }
    return FormattedRedditText(text, spans, links)
}
