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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.em
import androidx.compose.ui.text.withStyle
import com.boostlite.reddit.ui.text.MdStyle
import com.boostlite.reddit.ui.text.RedditInApp
import com.boostlite.reddit.ui.text.formatRedditText
import com.boostlite.reddit.ui.text.redditInApp

@Suppress("DEPRECATION")
@Composable
fun LinkedBody(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = MaterialTheme.typography.bodyMedium,
    color: Color = MaterialTheme.colorScheme.onSurface,
    onOpenSub: ((String) -> Unit)? = null,
    onOpenUser: ((String) -> Unit)? = null,
) {
    val uriHandler = LocalUriHandler.current
    val formatted = remember(text) { formatRedditText(text) }
    val linkStyle = SpanStyle(
        color = MaterialTheme.colorScheme.primary,
        textDecoration = TextDecoration.Underline,
    )
    val bodyStyle = SpanStyle(color = color)
    val quoteStyle = SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)
    val annotated = remember(formatted, linkStyle, bodyStyle, quoteStyle) {
        buildAnnotatedString {
            withStyle(bodyStyle) { append(formatted.text) }
            for (span in formatted.spans) {
                val spanStyle = when (span.style) {
                    MdStyle.BOLD -> SpanStyle(fontWeight = FontWeight.Bold)
                    MdStyle.ITALIC -> SpanStyle(fontStyle = FontStyle.Italic)
                    MdStyle.STRIKE -> SpanStyle(textDecoration = TextDecoration.LineThrough)
                    MdStyle.CODE -> SpanStyle(fontFamily = FontFamily.Monospace)
                    MdStyle.HEADING -> SpanStyle(fontWeight = FontWeight.Bold, fontSize = 1.1.em)
                    MdStyle.QUOTE -> quoteStyle
                    MdStyle.LIST -> null
                }
                if (spanStyle != null) addStyle(spanStyle, span.start, span.end)
            }
            for (link in formatted.links) {
                addStyle(linkStyle, link.start, link.end)
                addStringAnnotation("URL", link.url, link.start, link.end)
            }
        }
    }
    ClickableText(
        text = annotated,
        modifier = modifier,
        style = style.merge(TextStyle(color = color)),
        onClick = { offset ->
            annotated.getStringAnnotations("URL", offset, offset).firstOrNull()?.let { ann ->
                runCatching {
                    when (val target = redditInApp(ann.item)) {
                        is RedditInApp.Sub ->
                            onOpenSub?.invoke(target.name) ?: uriHandler.openUri(ann.item)
                        is RedditInApp.User ->
                            onOpenUser?.invoke(target.name) ?: uriHandler.openUri(ann.item)
                        null -> uriHandler.openUri(ann.item)
                    }
                }
            }
        },
    )
}
