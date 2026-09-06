package com.boostlite.reddit.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.boostlite.reddit.data.model.MediaType
import com.boostlite.reddit.data.model.RedditPost

/** Media on the comments screen. Video stays a still until fullscreen. */
@Composable
fun MediaContent(
    post: RedditPost,
    modifier: Modifier = Modifier,
    onPlay: (() -> Unit)? = null,
) {
    val media = post.media
    when (media.type) {
        MediaType.VIDEO -> {
            val stream = media.videoUrl
            if (media.isGif && stream != null) {
                var muted by remember(post.id) { mutableStateOf(true) }
                Box(modifier.fillMaxWidth()) {
                    VideoPlayer(
                        url = stream,
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 180.dp, max = 480.dp),
                        autoPlay = true,
                        muted = muted,
                        showController = false,
                        posterUrl = media.previewUrl,
                    )
                    if (media.hasAudio) {
                        AudioToggleButton(
                            muted = muted,
                            onClick = { muted = !muted },
                            modifier = Modifier.align(Alignment.BottomEnd),
                        )
                    }
                }
            } else {
                Box(modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    media.previewUrl?.let { FullImage(it, post.title, Modifier.fillMaxWidth()) }
                    Icon(
                        imageVector = Icons.Filled.PlayCircle,
                        contentDescription = "Play",
                        tint = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier
                            .size(48.dp)
                            .then(if (onPlay != null) Modifier.clickable(onClick = onPlay) else Modifier),
                    )
                }
            }
        }

        MediaType.GALLERY -> {
            val urls = media.galleryUrls
            val pagerState = rememberPagerState(pageCount = { urls.size })
            Column(modifier.fillMaxWidth()) {
                HorizontalPager(state = pagerState) { page ->
                    FullImage(urls[page], post.title, Modifier.fillMaxWidth())
                }
                Text(
                    text = "${pagerState.currentPage + 1} / ${urls.size}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(8.dp).align(Alignment.CenterHorizontally),
                )
            }
        }

        MediaType.IMAGE, MediaType.GIF -> {
            media.previewUrl?.let { FullImage(it, post.title, modifier) }
        }

        MediaType.LINK -> {
            Column(modifier.fillMaxWidth()) {
                media.previewUrl?.let { FullImage(it, post.title, Modifier.fillMaxWidth()) }
                post.linkUrl?.let { url ->
                    LinkedBody(
                        text = url,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        }

        MediaType.TEXT, MediaType.NONE -> {
            media.previewUrl?.let { FullImage(it, post.title, modifier) }
        }
    }
}

@Composable
private fun FullImage(url: String, contentDescription: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.Center,
    ) {
        PostImage(
            url = url,
            contentDescription = contentDescription,
            original = true,
            modifier = Modifier.fillMaxWidth().heightIn(max = 520.dp),
        )
    }
}
