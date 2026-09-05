package com.boostlite.reddit.ui.navigation

import android.net.Uri
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.ui.media.MediaViewer
import com.boostlite.reddit.ui.media.MediaViewerStore
import com.boostlite.reddit.ui.screens.feed.FeedScreen
import com.boostlite.reddit.ui.screens.post.PostScreen
import com.boostlite.reddit.ui.screens.search.SearchScreen
import com.boostlite.reddit.ui.screens.settings.SettingsScreen

object Routes {
    const val FEED = "feed"
    const val POST = "post"
    const val SEARCH = "search"
    const val SETTINGS = "settings"

    fun post(permalink: String): String = "$POST?link=${Uri.encode(permalink)}"
    fun search(subreddit: String? = null): String =
        if (subreddit.isNullOrBlank()) SEARCH else "$SEARCH?sub=${Uri.encode(subreddit)}"
}

@Composable
fun BoostNavHost(navController: NavHostController = rememberNavController()) {
    val mediaViewer = remember { MediaViewerStore() }
    val viewing by mediaViewer.post.collectAsStateWithLifecycle()
    val autoplay by mediaViewer.autoplay.collectAsStateWithLifecycle()
    val app = BoostLiteApp.instance

    Box(Modifier.fillMaxSize()) {
        NavHost(navController = navController, startDestination = Routes.FEED) {
            composable(Routes.FEED) {
                FeedScreen(
                    onOpenPost = { permalink -> navController.navigate(Routes.post(permalink)) },
                    onOpenMedia = mediaViewer::open,
                    onOpenSearch = { sub -> navController.navigate(Routes.search(sub)) },
                    onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                )
            }

            composable(
                route = "${Routes.POST}?link={link}",
                arguments = listOf(navArgument("link") { type = NavType.StringType; defaultValue = "" }),
            ) { entry ->
                val link = entry.arguments?.getString("link").orEmpty()
                PostScreen(
                    permalink = link,
                    onBack = { navController.popBackStack() },
                    onOpenMedia = mediaViewer::open,
                )
            }

            composable(
                route = "${Routes.SEARCH}?sub={sub}",
                arguments = listOf(navArgument("sub") { type = NavType.StringType; defaultValue = "" }),
            ) { entry ->
                val sub = entry.arguments?.getString("sub").orEmpty().ifBlank { null }
                SearchScreen(
                    restrictSubreddit = sub,
                    onOpenPost = { permalink -> navController.navigate(Routes.post(permalink)) },
                    onOpenMedia = mediaViewer::open,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(Routes.SETTINGS) {
                SettingsScreen(onBack = { navController.popBackStack() })
            }
        }

        viewing?.let { post ->
            MediaViewer(
                post = post,
                autoplay = autoplay,
                onDismiss = mediaViewer::close,
                onComments = {
                    val current = navController.currentBackStackEntry?.arguments?.getString("link")
                        ?.let { Uri.decode(it) }
                    val go = mediaViewer.commentsNeedsNavigation(current)
                    mediaViewer.close()
                    if (go) navController.navigate(Routes.post(post.permalink))
                },
                onSave = {
                    post.media.downloadUrl?.let { url ->
                        app.downloader.enqueue(
                            url = url,
                            subreddit = post.subreddit,
                            title = post.title,
                        )
                    }
                },
            )
        }
    }
}
