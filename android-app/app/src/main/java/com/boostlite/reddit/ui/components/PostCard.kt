package com.boostlite.reddit.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Comment
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.boostlite.reddit.data.model.MediaType
import com.boostlite.reddit.data.model.RedditPost
import com.boostlite.reddit.ui.compactCount
import com.boostlite.reddit.ui.relativeTime

@Composable
fun PostCard(
    post: RedditPost,
    onClick: () -> Unit,
    onOpenMedia: () -> Unit,
    onPlayMedia: () -> Unit = onOpenMedia,
    onDownload: () -> Unit,
    onSubredditClick: (String) -> Unit,
    autoPlay: Boolean = false,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        // Meta row
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "r/${post.subreddit}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clickable { onSubredditClick(post.subreddit) },
            )
            Dot()
            Text(
                text = "u/${post.author}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Dot()
            Text(
                text = relativeTime(post.createdUtc),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (post.over18) {
                Dot()
                Text(
                    text = "NSFW",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        Spacer(Modifier.size(6.dp))

        Text(
            text = post.title,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )

        val preview = post.media.previewUrl
        val stream = post.media.videoUrl
        if (preview != null || stream != null) {
            Spacer(Modifier.size(8.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .clickable(onClick = onOpenMedia),
                contentAlignment = Alignment.Center,
            ) {
                if (preview != null) {
                    PostImage(
                        url = preview,
                        contentDescription = post.title,
                        original = false,
                        modifier = Modifier
                            .fillMaxWidth()
                            .wrapContentHeight()
                            .heightIn(max = 480.dp),
                    )
                }
                if (stream != null && autoPlay) {
                    VideoPlayer(
                        url = stream,
                        modifier = if (preview != null) {
                            Modifier.matchParentSize()
                        } else {
                            Modifier
                                .fillMaxWidth()
                                .heightIn(min = 180.dp, max = 480.dp)
                        },
                        autoPlay = true,
                        muted = true,
                        showController = false,
                        posterUrl = preview,
                    )
                }
                if (post.media.type == MediaType.GALLERY) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(MaterialTheme.colorScheme.background)
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text(
                            text = "${post.media.galleryUrls.size} imgs",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }
        }

        Spacer(Modifier.size(8.dp))

        // Footer actions
        Row(verticalAlignment = Alignment.CenterVertically) {
            FooterStat(Icons.Filled.ArrowUpward, compactCount(post.score))
            Spacer(Modifier.width(16.dp))
            FooterStat(Icons.Filled.Comment, compactCount(post.numComments))
            Spacer(Modifier.weight(1f))
            if (post.media.downloadUrl != null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .clickable(onClick = onDownload)
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Download,
                        contentDescription = "Download",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = "Save",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun FooterStat(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(4.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun Dot() {
    Text(
        text = "  •  ",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}
