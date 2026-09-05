package com.boostlite.reddit.ui.screens.search

import android.widget.Toast
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
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.ui.UiState
import com.boostlite.reddit.ui.components.ErrorState
import com.boostlite.reddit.ui.components.PostCard
import com.boostlite.reddit.ui.components.SubredditRow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    restrictSubreddit: String?,
    onOpenPost: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: SearchViewModel = viewModel(),
) {
    LaunchedEffect(restrictSubreddit) { viewModel.setRestrictSub(restrictSubreddit) }

    val query by viewModel.query.collectAsStateWithLifecycle()
    val restrict by viewModel.restrictSub.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val app = BoostLiteApp.instance
    val context = LocalContext.current
    val starredNames by viewModel.starredNames.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                ),
                title = { Text("Search") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            OutlinedTextField(
                value = query,
                onValueChange = viewModel::setQuery,
                modifier = Modifier.fillMaxWidth().padding(12.dp),
                singleLine = true,
                label = { Text("Search Reddit") },
                trailingIcon = {
                    IconButton(onClick = viewModel::submit) {
                        Icon(Icons.Filled.Search, contentDescription = "Go")
                    }
                },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { viewModel.submit() }),
            )

            if (restrictSubreddit != null) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    FilterChip(
                        selected = restrict != null,
                        onClick = { viewModel.setRestrictSub(restrictSubreddit) },
                        label = { Text("r/$restrictSubreddit") },
                    )
                    FilterChip(
                        selected = restrict == null,
                        onClick = { viewModel.setRestrictSub(null) },
                        label = { Text("All of Reddit") },
                    )
                }
            }

            HorizontalDivider(
                color = MaterialTheme.colorScheme.outline,
                modifier = Modifier.padding(top = 8.dp),
            )

            when (val s = state) {
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
                    val results = s.data
                    if (results.communities.isEmpty() && results.posts.isEmpty()) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(
                                text = "No results.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(bottom = 24.dp),
                        ) {
                            if (results.communities.isNotEmpty()) {
                                item {
                                    Text(
                                        "Communities",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    )
                                }
                                items(results.communities, key = { "sr-${it.name}" }) { sub ->
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
                                item { HorizontalDivider(color = MaterialTheme.colorScheme.outline) }
                            }
                            if (results.posts.isNotEmpty()) {
                                if (results.communities.isNotEmpty()) {
                                    item {
                                        Text(
                                            "Posts",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                        )
                                    }
                                }
                                items(results.posts, key = { it.id }) { post ->
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
                                        onSubredditClick = {
                                            viewModel.openSub(it)
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
