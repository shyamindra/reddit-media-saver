package com.boostlite.reddit.ui.navigation

import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
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
    NavHost(navController = navController, startDestination = Routes.FEED) {
        composable(Routes.FEED) {
            FeedScreen(
                onOpenPost = { permalink -> navController.navigate(Routes.post(permalink)) },
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
                onBack = { navController.popBackStack() },
            )
        }

        composable(Routes.SETTINGS) {
            SettingsScreen(onBack = { navController.popBackStack() })
        }
    }
}
