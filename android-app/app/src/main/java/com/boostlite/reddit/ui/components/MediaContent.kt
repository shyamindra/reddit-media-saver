package com.boostlite.reddit.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.boostlite.reddit.data.model.MediaType
import com.boostlite.reddit.data.model.RedditPost

/** Full-size media rendering used on the post detail screen. */
@Composable
fun MediaContent(post: RedditPost, modifier: Modifier = Modifier) {
    val media = post.media
    when (media.type) {
        MediaType.VIDEO -> {
            val stream = media.videoUrl
            if (stream != null) {
                VideoPlayer(
                    url = stream,
                    modifier = modifier
                        .fillMaxWidth()
                        .heightIn(min = 220.dp, max = 460.dp),
                )
            } else {
                media.previewUrl?.let { FullImage(it, post.title, modifier) }
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
                    Text(
                        text = url,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
        }

        MediaType.TEXT, MediaType.NONE -> {
            // Self text is rendered by the caller; nothing to show here.
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
        AsyncImage(
            model = url,
            contentDescription = contentDescription,
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxWidth().heightIn(max = 520.dp),
        )
    }
}
