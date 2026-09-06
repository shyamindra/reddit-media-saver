package com.boostlite.reddit.ui.screens.search

import android.widget.Toast
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.data.model.RedditPost
import com.boostlite.reddit.data.model.SearchSort
import com.boostlite.reddit.ui.UiState
import com.boostlite.reddit.ui.components.ErrorState
import com.boostlite.reddit.ui.components.PostCard
import com.boostlite.reddit.ui.components.SubredditRow
import com.boostlite.reddit.ui.components.TimeMenu
import com.boostlite.reddit.ui.list.centeredKey

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    restrictSubreddit: String?,
    onOpenPost: (String) -> Unit,
    onOpenMedia: (RedditPost, Boolean) -> Unit,
    onBack: () -> Unit,
    viewModel: SearchViewModel = viewModel(),
) {
    LaunchedEffect(restrictSubreddit) { viewModel.setOriginSub(restrictSubreddit) }

    val query by viewModel.query.collectAsStateWithLifecycle()
    val originSub by viewModel.originSub.collectAsStateWithLifecycle()
    val restrictSub by viewModel.restrictSub.collectAsStateWithLifecycle()
    val sort by viewModel.sort.collectAsStateWithLifecycle()
    val time by viewModel.time.collectAsStateWithLifecycle()
    val suggestions by viewModel.suggestions.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val isRefreshing by viewModel.isRefreshing.collectAsStateWithLifecycle()
    val app = BoostLiteApp.instance
    val context = LocalContext.current
    val starredNames by viewModel.starredNames.collectAsStateWithLifecycle()
    val listKey = "${query}|${restrictSub}|${sort.path}|${time.path}"
    val listState = rememberSaveable(listKey, saver = LazyListState.Saver) { LazyListState() }

    Scaffold { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(end = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
                OutlinedTextField(
                    value = query,
                    onValueChange = viewModel::setQuery,
                    modifier = Modifier.weight(1f).padding(vertical = 8.dp),
                    singleLine = true,
                    label = { Text(if (restrictSub != null) "r/$restrictSub" else "Reddit") },
                    trailingIcon = {
                        IconButton(onClick = viewModel::submit) {
                            Icon(Icons.Filled.Search, contentDescription = "Go")
                        }
                    },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { viewModel.submit() }),
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (originSub != null) {
                        FilterChip(
                            selected = restrictSub != null,
                            onClick = { viewModel.setRestrictToOrigin(true) },
                            label = { Text("r/$originSub") },
                        )
                        FilterChip(
                            selected = restrictSub == null,
                            onClick = { viewModel.setRestrictToOrigin(false) },
                            label = { Text("Reddit") },
                        )
                    }
                    SearchSort.entries.forEach { s ->
                        FilterChip(
                            selected = s == sort,
                            onClick = { viewModel.setSort(s) },
                            label = { Text(s.label) },
                        )
                    }
                }
                TimeMenu(
                    current = time,
                    onSelect = viewModel::setTime,
                    modifier = Modifier.padding(start = 8.dp),
                )
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outline)

            if (suggestions.isNotEmpty()) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 24.dp),
                ) {
                    items(suggestions, key = { "sr-${it.name}" }) { sub ->
                        val starred = starredNames.any { it.equals(sub.name, ignoreCase = true) }
                        SubredditRow(
                            subreddit = sub,
                            starred = starred,
                            onClick = {
                                viewModel.openSub(sub.name)
                                onBack()
                            },
                            onToggleStar = {
                                val now = viewModel.toggleStar(sub.name)
                                if (!now && !starred) {
                                    Toast.makeText(context, "Starred limit reached", Toast.LENGTH_SHORT).show()
                                }
                            },
                        )
                    }
                }
            } else when (val s = state) {
                null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        text = "Type a query and hit search.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                is UiState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
                is UiState.Error -> ErrorState(
                    message = s.message,
                    needsCookies = s.needsCookies,
                    onImportCookies = onBack,
                    onRetry = viewModel::submit,
                )
                is UiState.Success -> {
                    val posts = s.data
                    PullToRefreshBox(
                        isRefreshing = isRefreshing,
                        onRefresh = { viewModel.refresh() },
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        if (posts.isEmpty()) {
                            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text(
                                    text = "No results.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        } else {
                            val centeredId = listState.centeredKey()
                            LazyColumn(
                                state = listState,
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(bottom = 24.dp),
                            ) {
                                items(posts, key = { it.id }) { post ->
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
                                        onSubredditClick = {
                                            viewModel.openSub(it)
                                            onBack()
                                        },
                                        onAuthorClick = {
                                            viewModel.openUser(it)
                                            onBack()
                                        },
                                    )
                                    HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
