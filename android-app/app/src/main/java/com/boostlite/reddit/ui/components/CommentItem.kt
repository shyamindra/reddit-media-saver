package com.boostlite.reddit.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.boostlite.reddit.data.model.RedditComment
import com.boostlite.reddit.ui.compactCount
import com.boostlite.reddit.ui.relativeTime

private val DepthColors = listOf(
    Color(0xFFFF6D3B),
    Color(0xFF6D8BFF),
    Color(0xFF43B581),
    Color(0xFFF5C542),
    Color(0xFFB56DFF),
)

@Composable
fun CommentItem(
    comment: RedditComment,
    onAuthorClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val indent = (comment.depth.coerceAtMost(8) * 10).dp
    val barColor = DepthColors[comment.depth % DepthColors.size]
    val authorClickable = comment.author.isNotBlank() && comment.author != "[deleted]"

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .padding(start = indent),
    ) {
        if (comment.depth > 0) {
            Spacer(
                modifier = Modifier
                    .width(2.dp)
                    .fillMaxHeight()
                    .background(barColor),
            )
            Spacer(Modifier.width(8.dp))
        }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp, horizontal = 12.dp),
        ) {
            Row {
                Text(
                    text = "u/${comment.author}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                    modifier = if (authorClickable) {
                        Modifier.clickable { onAuthorClick(comment.author) }
                    } else {
                        Modifier
                    },
                )
                Text(
                    text = "  •  ${compactCount(comment.score)}  •  ${relativeTime(comment.createdUtc)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.size(4.dp))
            LinkedBody(
                text = comment.body,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}
