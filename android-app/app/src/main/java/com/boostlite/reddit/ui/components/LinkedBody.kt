package com.boostlite.reddit.ui.components

import androidx.compose.foundation.text.ClickableText
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import com.boostlite.reddit.ui.text.linkify

@Suppress("DEPRECATION")
@Composable
fun LinkedBody(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = MaterialTheme.typography.bodyMedium,
    color: Color = MaterialTheme.colorScheme.onSurface,
) {
    val uriHandler = LocalUriHandler.current
    val linked = remember(text) { linkify(text) }
    val linkStyle = SpanStyle(
        color = MaterialTheme.colorScheme.primary,
        textDecoration = TextDecoration.Underline,
    )
    val bodyStyle = SpanStyle(color = color)
    val annotated = remember(linked, linkStyle, bodyStyle) {
        buildAnnotatedString {
            var cursor = 0
            for (link in linked.links) {
                if (link.start > cursor) {
                    withStyle(bodyStyle) { append(linked.text.substring(cursor, link.start)) }
                }
                pushStringAnnotation("URL", link.url)
                withStyle(linkStyle) { append(linked.text.substring(link.start, link.end)) }
                pop()
                cursor = link.end
            }
            if (cursor < linked.text.length) {
                withStyle(bodyStyle) { append(linked.text.substring(cursor)) }
            }
        }
    }
    ClickableText(
        text = annotated,
        modifier = modifier,
        style = style.merge(TextStyle(color = color)),
        onClick = { offset ->
            annotated.getStringAnnotations("URL", offset, offset).firstOrNull()?.let { ann ->
                runCatching { uriHandler.openUri(ann.item) }
            }
        },
    )
}
