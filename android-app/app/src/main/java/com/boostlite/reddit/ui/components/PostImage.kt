package com.boostlite.reddit.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import coil.request.ImageRequest
import coil.size.Size
import com.boostlite.reddit.ui.media.feedStillDecodeSize

/**
 * Loads post stills. [original] keeps source resolution (post screen and
 * fullscreen). Cards pass false so Coil samples to at most 1080px.
 */
@Composable
fun PostImage(
    url: String?,
    contentDescription: String,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Fit,
    original: Boolean = true,
) {
    if (url.isNullOrBlank()) return
    val context = LocalContext.current
    val decodeSize = feedStillDecodeSize(context.resources.displayMetrics.widthPixels)
    val request = remember(url, original, decodeSize) {
        ImageRequest.Builder(context)
            .data(url)
            .apply {
                if (original) size(Size.ORIGINAL)
                else size(decodeSize, decodeSize)
            }
            .build()
    }
    AsyncImage(
        model = request,
        contentDescription = contentDescription,
        contentScale = contentScale,
        modifier = modifier,
    )
}
