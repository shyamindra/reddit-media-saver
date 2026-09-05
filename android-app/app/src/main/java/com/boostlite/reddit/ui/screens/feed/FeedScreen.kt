package com.boostlite.reddit.ui.screens.feed

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import com.boostlite.reddit.ui.UiState
import com.boostlite.reddit.ui.components.ErrorState
import com.boostlite.reddit.ui.components.PostCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    onOpenPost: (String) -> Unit,
    onOpenSearch: (String?) -> Unit,
    onOpenSettings: () -> Unit,
    viewModel: FeedViewModel = viewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val target by viewModel.target.collectAsStateWithLifecycle()
    val starred by viewModel.starredNames.collectAsStateWithLifecycle()
    val sort by viewModel.sort.collectAsStateWithLifecycle()
    val isLoadingMore by viewModel.isLoadingMore.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var showBookmarks by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()

    val shouldLoadMore by remember {
        derivedStateOf {
            val last = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            val total = listState.layoutInfo.totalItemsCount
            total > 0 && last >= total - 3
        }
    }
    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore) viewModel.loadMore()
    }

    val title = when (target) {
        is FeedTarget.Starred -> "Starred"
        is FeedTarget.All -> "r/all"
        is FeedTarget.Sub -> "r/${(target as FeedTarget.Sub).name}"
    }

    Scaffold(
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                ),
                title = {
                    Text(
                        text = title,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable { showBookmarks = true },
                    )
                },
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
            SortRow(current = sort, onSelect = viewModel::setSort)
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
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 24.dp),
                    ) {
                        items(s.data, key = { it.id }) { post ->
                            PostCard(
                                post = post,
                                onClick = { onOpenPost(post.permalink) },
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

    if (showBookmarks) {
        BookmarksSheet(
            starred = starred,
            onDismiss = { showBookmarks = false },
            onOpenStarred = {
                showBookmarks = false
                viewModel.openStarred()
            },
            onOpenAll = {
                showBookmarks = false
                viewModel.openAll()
            },
            onOpenSub = {
                showBookmarks = false
                viewModel.openSub(it)
            },
            onUnstar = viewModel::unstar,
            onGoTo = {
                showBookmarks = false
                viewModel.goToSubreddit(it)
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BookmarksSheet(
    starred: List<String>,
    onDismiss: () -> Unit,
    onOpenStarred: () -> Unit,
    onOpenAll: () -> Unit,
    onOpenSub: (String) -> Unit,
    onUnstar: (String) -> Unit,
    onGoTo: (String) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var goTo by remember { mutableStateOf("") }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(Modifier.padding(horizontal = 16.dp).padding(bottom = 32.dp)) {
            Text(
                "Bookmarks",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            if (starred.isNotEmpty()) {
                Text(
                    "Starred",
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onOpenStarred)
                        .padding(vertical = 12.dp),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Text(
                "r/all",
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onOpenAll)
                    .padding(vertical = 12.dp),
                style = MaterialTheme.typography.bodyLarge,
            )
            HorizontalDivider(Modifier.padding(vertical = 8.dp))
            starred.forEach { name ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "r/$name",
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onOpenSub(name) }
                            .padding(vertical = 12.dp),
                        style = MaterialTheme.typography.bodyLarge,
                    )
                    IconButton(onClick = { onUnstar(name) }) {
                        Icon(
                            Icons.Filled.Star,
                            contentDescription = "Unstar r/$name",
                            tint = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
            OutlinedTextField(
                value = goTo,
                onValueChange = { goTo = it },
                singleLine = true,
                label = { Text("Go to subreddit") },
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            )
            TextButton(
                onClick = { if (goTo.isNotBlank()) onGoTo(goTo) },
                modifier = Modifier.align(Alignment.End),
            ) { Text("Go") }
        }
    }
}

@Composable
private fun SortRow(current: FeedSort, onSelect: (FeedSort) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        FeedSort.entries.forEach { s ->
            FilterChip(
                selected = s == current,
                onClick = { onSelect(s) },
                label = { Text(s.label) },
            )
        }
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
