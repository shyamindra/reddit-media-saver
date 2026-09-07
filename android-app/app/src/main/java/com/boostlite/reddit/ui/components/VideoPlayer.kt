package com.boostlite.reddit.ui.components

import android.graphics.Color as AndroidColor
import android.view.LayoutInflater
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.boostlite.reddit.R

/**
 * Minimal ExoPlayer surface. Handles progressive mp4 and DASH (v.redd.it
 * dash_url) automatically via the default media source factory.
 *
 * Feed lists must use a TextureView surface (see [R.layout.player_view_texture]):
 * SurfaceView is a separate window and flickers while the LazyColumn scrolls.
 *
 * [posterUrl] stays visible until the first frame (or if playback fails) so a
 * missing DASH file does not sit on a black surface.
 */
@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@Composable
fun VideoPlayer(
    url: String,
    modifier: Modifier = Modifier,
    autoPlay: Boolean = false,
    muted: Boolean = false,
    showController: Boolean = true,
    posterUrl: String? = null,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var showPoster by remember(url, posterUrl) { mutableStateOf(!posterUrl.isNullOrBlank()) }

    val player = remember(url) {
        val tracks = DefaultTrackSelector(context).apply {
            setParameters(
                buildUponParameters()
                    .setForceHighestSupportedBitrate(true)
                    .setMaxVideoSize(Int.MAX_VALUE, Int.MAX_VALUE)
                    .setViewportSize(Int.MAX_VALUE, Int.MAX_VALUE, true),
            )
        }
        ExoPlayer.Builder(context).setTrackSelector(tracks).build().apply {
            setMediaItem(MediaItem.fromUri(url))
            prepare()
            playWhenReady = autoPlay
            volume = if (muted) 0f else 1f
            repeatMode = Player.REPEAT_MODE_ONE
        }
    }
    LaunchedEffect(player, muted) {
        player.volume = if (muted) 0f else 1f
    }
    LaunchedEffect(player, autoPlay) {
        player.playWhenReady = autoPlay
    }

    DisposableEffect(player, posterUrl) {
        val listener = object : Player.Listener {
            override fun onRenderedFirstFrame() {
                showPoster = false
            }
            override fun onPlayerError(error: PlaybackException) {
                if (!posterUrl.isNullOrBlank()) showPoster = true
            }
        }
        player.addListener(listener)
        onDispose { player.removeListener(listener) }
    }

    DisposableEffect(player, lifecycleOwner, autoPlay) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> {
                    player.playWhenReady = false
                    player.pause()
                }
                Lifecycle.Event.ON_START -> {
                    if (autoPlay) player.playWhenReady = true
                }
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            player.release()
        }
    }

    Box(modifier) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                (LayoutInflater.from(ctx).inflate(R.layout.player_view_texture, null, false) as PlayerView).apply {
                    useController = showController
                    isClickable = showController
                    resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                    setShutterBackgroundColor(AndroidColor.TRANSPARENT)
                    setKeepContentOnPlayerReset(true)
                }
            },
            update = { view ->
                if (view.player !== player) view.player = player
                view.useController = showController
            },
        )
        if (showPoster && !posterUrl.isNullOrBlank()) {
            PostImage(
                url = posterUrl,
                contentDescription = "",
                original = false,
                modifier = Modifier.fillMaxSize(),
            )
        }
    }
}
