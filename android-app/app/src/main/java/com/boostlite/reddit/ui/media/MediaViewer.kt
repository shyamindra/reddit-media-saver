package com.boostlite.reddit.ui.media

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Comment
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.boostlite.reddit.data.model.MediaType
import com.boostlite.reddit.data.model.RedditPost
import com.boostlite.reddit.ui.components.AudioToggleButton
import com.boostlite.reddit.ui.components.PostImage
import com.boostlite.reddit.ui.components.VideoPlayer

@Composable
fun MediaViewer(
    post: RedditPost,
    autoplay: Boolean = false,
    onDismiss: () -> Unit,
    onComments: () -> Unit,
    onSave: () -> Unit,
) {
    var chrome by remember { mutableStateOf(true) }
    var playVideo by remember(post.id) {
        mutableStateOf(post.media.videoUrl != null)
    }
    var muted by remember(post.id) { mutableStateOf(false) }
    BackHandler(onBack = onDismiss)
    LaunchedEffect(playVideo) {
        if (playVideo) chrome = true
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = { if (!playVideo) chrome = !chrome },
            ),
    ) {
        FullscreenBody(
            post = post,
            playVideo = playVideo,
            muted = muted,
            onPlayVideo = { playVideo = true },
        )

        if (playVideo && post.media.hasAudio && post.media.videoUrl != null) {
            AudioToggleButton(
                muted = muted,
                onClick = { muted = !muted },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .navigationBarsPadding()
                    .padding(bottom = 16.dp, end = 8.dp),
            )
        }

        if (chrome) {
            ViewerChrome(
                post = post,
                showCaption = !playVideo,
                onDismiss = onDismiss,
                onComments = onComments,
                onSave = onSave,
            )
        }
    }
}

@Composable
private fun FullscreenBody(
    post: RedditPost,
    playVideo: Boolean,
    muted: Boolean,
    onPlayVideo: () -> Unit,
) {
    val media = post.media
    when (media.type) {
        MediaType.VIDEO -> {
            val stream = media.videoUrl
            if (playVideo && stream != null) {
                VideoPlayer(
                    url = stream,
                    modifier = Modifier.fillMaxSize(),
                    autoPlay = true,
                    muted = muted,
                    showController = false,
                    posterUrl = media.previewUrl,
                )
            } else {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    FitImage(media.previewUrl, post.title)
                    if (stream != null) {
                        IconButton(onClick = onPlayVideo) {
                            Icon(
                                imageVector = Icons.Filled.PlayCircle,
                                contentDescription = "Play",
                                tint = Color.White,
                                modifier = Modifier.size(72.dp),
                            )
                        }
                    }
                }
            }
        }
        MediaType.GALLERY -> {
            val urls = media.galleryUrls.ifEmpty {
                listOfNotNull(media.previewUrl)
            }
            val pagerState = rememberPagerState(pageCount = { urls.size })
            Box(Modifier.fillMaxSize()) {
                HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
                    FitImage(urls[page], post.title)
                }
                Text(
                    text = "${pagerState.currentPage + 1} / ${urls.size}",
                    color = Color.White,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .navigationBarsPadding()
                        .padding(bottom = 72.dp),
                )
            }
        }
        else -> FitImage(fullscreenImageUrl(media.previewUrl, media.downloadUrl), post.title)
    }
}

@Composable
private fun FitImage(url: String?, contentDescription: String) {
    PostImage(
        url = url,
        contentDescription = contentDescription,
        original = true,
        modifier = Modifier.fillMaxSize(),
    )
}

@Composable
private fun BoxScope.ViewerChrome(
    post: RedditPost,
    showCaption: Boolean,
    onDismiss: () -> Unit,
    onComments: () -> Unit,
    onSave: () -> Unit,
) {
    Row(
        modifier = Modifier
            .align(Alignment.TopCenter)
            .fillMaxWidth()
            .background(Color.Black.copy(alpha = 0.45f))
            .statusBarsPadding()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = {},
            ),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onDismiss) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
        }
        Text(
            text = "r/${post.subreddit}",
            color = Color.White,
            style = MaterialTheme.typography.titleSmall,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        IconButton(onClick = onComments) {
            Icon(Icons.AutoMirrored.Filled.Comment, contentDescription = "Comments", tint = Color.White)
        }
        if (post.media.downloadUrl != null) {
            IconButton(onClick = onSave) {
                Icon(Icons.Filled.Download, contentDescription = "Save", tint = Color.White)
            }
        }
    }
    if (showCaption) {
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(Color.Black.copy(alpha = 0.45f))
                .navigationBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = {},
                ),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = post.title,
                color = Color.White,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
