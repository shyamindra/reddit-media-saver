package com.boostlite.reddit.ui.screens.feed

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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.data.model.FeedSort
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
    val subreddit by viewModel.subreddit.collectAsStateWithLifecycle()
    val sort by viewModel.sort.collectAsStateWithLifecycle()
    val isLoadingMore by viewModel.isLoadingMore.collectAsStateWithLifecycle()

    var showSubDialog by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()

    // Infinite scroll: load more when near the end.
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

    Scaffold(
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                ),
                title = {
                    Text(
                        text = if (subreddit == "all") "r/all" else "r/$subreddit",
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable { showSubDialog = true },
                    )
                },
                actions = {
                    IconButton(onClick = { onOpenSearch(if (subreddit == "all") null else subreddit) }) {
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
                                            cookieHeader = app.cookieStore.currentHeader(),
                                        )
                                    }
                                },
                                onSubredditClick = { viewModel.setSubreddit(it) },
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

    if (showSubDialog) {
        SubredditDialog(
            initial = subreddit,
            onDismiss = { showSubDialog = false },
            onConfirm = {
                showSubDialog = false
                viewModel.setSubreddit(it)
            },
        )
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SubredditDialog(
    initial: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
) {
    var text by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Go to subreddit") },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                singleLine = true,
                label = { Text("subreddit (e.g. all, pics)") },
            )
        },
        confirmButton = { TextButton(onClick = { onConfirm(text) }) { Text("Go") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
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
