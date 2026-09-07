package com.boostlite.reddit.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.boostlite.reddit.data.model.ProfileComment
import com.boostlite.reddit.ui.relativeTime

@Composable
fun ProfileCommentRow(
    comment: ProfileComment,
    onClick: () -> Unit,
    onSubredditClick: (String) -> Unit,
    onAuthorClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val authorClickable = comment.author.isNotBlank() && comment.author != "[deleted]"
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "r/${comment.subreddit}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clickable { onSubredditClick(comment.subreddit) },
            )
            Text(
                text = "  •  ",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = "u/${comment.author}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = if (authorClickable) {
                    Modifier.clickable { onAuthorClick(comment.author) }
                } else {
                    Modifier
                },
            )
            Text(
                text = "  •  ${relativeTime(comment.createdUtc)}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (comment.body.isNotBlank()) {
            Spacer(Modifier.size(6.dp))
            LinkedBody(
                text = comment.body,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                onOpenSub = onSubredditClick,
                onOpenUser = onAuthorClick,
            )
        }
    }
}
