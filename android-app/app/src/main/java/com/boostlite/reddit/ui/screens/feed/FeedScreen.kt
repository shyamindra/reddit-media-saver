package com.boostlite.reddit.ui.screens.feed

import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.data.model.FeedSort
import com.boostlite.reddit.data.model.FeedTarget
import com.boostlite.reddit.data.model.RedditPost
import com.boostlite.reddit.data.model.SearchTime
import com.boostlite.reddit.ui.UiState
import com.boostlite.reddit.ui.components.ErrorState
import com.boostlite.reddit.ui.components.PostCard
import com.boostlite.reddit.ui.components.TimeMenu
import com.boostlite.reddit.ui.list.centeredKey
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    onOpenPost: (String) -> Unit,
    onOpenMedia: (RedditPost, Boolean) -> Unit,
    onOpenSearch: (String?) -> Unit,
    onOpenSettings: () -> Unit,
    viewModel: FeedViewModel = viewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val target by viewModel.target.collectAsStateWithLifecycle()
    val starred by viewModel.starredNames.collectAsStateWithLifecycle()
    val sort by viewModel.sort.collectAsStateWithLifecycle()
    val time by viewModel.time.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.isRefreshing.collectAsStateWithLifecycle()
    val isLoadingMore by viewModel.isLoadingMore.collectAsStateWithLifecycle()
    BackHandler(enabled = viewModel.canGoBack()) { viewModel.goBack() }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val listKey = "${target}|${sort.path}|${time.path}"
    val listState = remember(listKey) { androidx.compose.foundation.lazy.LazyListState() }

    val shouldLoadMore by remember(listState) {
        derivedStateOf {
            val last = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            val total = listState.layoutInfo.totalItemsCount
            total > 0 && last >= total - 3
        }
    }
    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore) viewModel.loadMore()
    }

    fun closeDrawer() {
        scope.launch { drawerState.close() }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            FeedDrawer(
                target = target,
                starred = starred,
                onOpenStarred = {
                    viewModel.openStarred()
                    closeDrawer()
                },
                onOpenAll = {
                    viewModel.openAll()
                    closeDrawer()
                },
                onOpenSub = {
                    viewModel.openSub(it)
                    closeDrawer()
                },
                onUnstar = viewModel::unstar,
                onGoTo = {
                    viewModel.goToSubreddit(it)
                    closeDrawer()
                },
            )
        },
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                        titleContentColor = MaterialTheme.colorScheme.onSurface,
                    ),
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Filled.Menu, contentDescription = "Feeds")
                        }
                    },
                    title = { FeedTitle(target) },
                    actions = {
                        if (target is FeedTarget.Sub) {
                            val starredHere = viewModel.isCurrentSubStarred()
                            IconButton(
                                onClick = {
                                    val nowStarred = viewModel.toggleCurrentStar()
                                    if (nowStarred == false && !starredHere) {
                                        Toast.makeText(context, "Starred limit reached", Toast.LENGTH_SHORT).show()
                                    }
                                },
                            ) {
                                Icon(
                                    imageVector = if (starredHere) Icons.Filled.Star else Icons.Outlined.Star,
                                    contentDescription = if (starredHere) "Unstar subreddit" else "Star subreddit",
                                    tint = if (starredHere) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.onSurface,
                                )
                            }
                        }
                        IconButton(onClick = { onOpenSearch(viewModel.searchSubArg()) }) {
                            Icon(Icons.Filled.Search, contentDescription = "Search")
                        }
                        IconButton(onClick = onOpenSettings) {
                            Icon(Icons.Filled.Settings, contentDescription = "Settings")
                        }
                    },
                )
            },
        ) { padding ->
            Column(Modifier.fillMaxSize().padding(padding)) {
                SortAndTimeRow(
                    sort = sort,
                    time = time,
                    onSort = viewModel::setSort,
                    onTime = viewModel::setTime,
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)

                when (val s = state) {
                    is UiState.Loading -> CenterLoader()
                    is UiState.Error -> ErrorState(
                        message = s.message,
                        needsCookies = s.needsCookies,
                        onImportCookies = onOpenSettings,
                        onRetry = viewModel::load,
                    )
                    is UiState.Success -> {
                        val app = BoostLiteApp.instance
                        val centeredId = listState.centeredKey()
                        PullToRefreshBox(
                            isRefreshing = isRefreshing,
                            onRefresh = { viewModel.refresh() },
                            modifier = Modifier.fillMaxSize(),
                        ) {
                            LazyColumn(
                                state = listState,
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(bottom = 24.dp),
                            ) {
                                items(s.data, key = { it.id }) { post ->
                                    PostCard(
                                        post = post,
                                        autoPlay = post.id == centeredId,
                                        onClick = { onOpenPost(post.permalink) },
                                        onOpenMedia = { onOpenMedia(post, true) },
                                        onPlayMedia = { onOpenMedia(post, true) },
                                        onDownload = {
                                            post.media.downloadUrl?.let { url ->
                                                app.downloader.enqueue(
                                                    url = url,
                                                    subreddit = post.subreddit,
                                                    title = post.title,
                                                )
                                            }
                                        },
                                        onSubredditClick = { viewModel.openSub(it) },
                                    )
                                    HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                                }
                                if (isLoadingMore) {
                                    item { CenterLoader(height = 64) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FeedTitle(target: FeedTarget) {
    when (target) {
        is FeedTarget.Starred -> {
            Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = "Starred feed",
                tint = MaterialTheme.colorScheme.primary,
            )
        }
        is FeedTarget.All -> Text("r/all", fontWeight = FontWeight.SemiBold)
        is FeedTarget.Sub -> Text("r/${target.name}", fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun FeedDrawer(
    target: FeedTarget,
    starred: List<String>,
    onOpenStarred: () -> Unit,
    onOpenAll: () -> Unit,
    onOpenSub: (String) -> Unit,
    onUnstar: (String) -> Unit,
    onGoTo: (String) -> Unit,
) {
    var goTo by remember { mutableStateOf("") }
    ModalDrawerSheet {
        Column(Modifier.padding(bottom = 24.dp)) {
            Text(
                "Feeds",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 28.dp, vertical = 16.dp),
            )
            if (starred.isNotEmpty()) {
                NavigationDrawerItem(
                    label = { Text("Starred") },
                    selected = target is FeedTarget.Starred,
                    onClick = onOpenStarred,
                    icon = { Icon(Icons.Filled.Star, contentDescription = null) },
                    modifier = Modifier.padding(horizontal = 12.dp),
                )
            }
            NavigationDrawerItem(
                label = { Text("r/all") },
                selected = target is FeedTarget.All,
                onClick = onOpenAll,
                modifier = Modifier.padding(horizontal = 12.dp),
            )
            if (starred.isNotEmpty()) {
                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                Text(
                    "Starred subs",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 28.dp, vertical = 8.dp),
                )
                starred.forEach { name ->
                    NavigationDrawerItem(
                        label = { Text("r/$name") },
                        selected = (target as? FeedTarget.Sub)?.name.equals(name, ignoreCase = true),
                        onClick = { onOpenSub(name) },
                        badge = {
                            IconButton(onClick = { onUnstar(name) }) {
                                Icon(
                                    Icons.Filled.Star,
                                    contentDescription = "Unstar r/$name",
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                            }
                        },
                        modifier = Modifier.padding(horizontal = 12.dp),
                    )
                }
            }
            OutlinedTextField(
                value = goTo,
                onValueChange = { goTo = it },
                singleLine = true,
                label = { Text("Go to subreddit") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 28.dp)
                    .padding(top = 16.dp),
            )
            TextButton(
                onClick = { if (goTo.isNotBlank()) onGoTo(goTo) },
                modifier = Modifier
                    .align(Alignment.End)
                    .padding(end = 16.dp),
            ) { Text("Go") }
        }
    }
}

@Composable
private fun SortAndTimeRow(
    sort: FeedSort,
    time: SearchTime,
    onSort: (FeedSort) -> Unit,
    onTime: (SearchTime) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 4.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            modifier = Modifier
                .weight(1f)
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            FeedSort.entries.forEach { s ->
                FilterChip(
                    selected = s == sort,
                    onClick = { onSort(s) },
                    label = { Text(s.label) },
                )
            }
        }
        TimeMenu(current = time, onSelect = onTime, modifier = Modifier.padding(start = 8.dp))
    }
}

@Composable
private fun CenterLoader(height: Int = 0) {
    Box(
        modifier = if (height > 0) {
            Modifier.fillMaxWidth().padding(vertical = (height / 4).dp)
        } else {
            Modifier.fillMaxSize()
        },
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
    }
}
