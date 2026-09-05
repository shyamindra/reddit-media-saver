package com.boostlite.reddit.ui.screens.post

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.data.model.MediaType
import com.boostlite.reddit.ui.UiState
import com.boostlite.reddit.ui.components.CommentItem
import com.boostlite.reddit.ui.components.ErrorState
import com.boostlite.reddit.ui.components.MediaContent
import com.boostlite.reddit.ui.compactCount
import com.boostlite.reddit.ui.relativeTime

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostScreen(
    permalink: String,
    onBack: () -> Unit,
    viewModel: PostViewModel = viewModel(),
) {
    LaunchedEffect(permalink) { viewModel.load(permalink) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val app = BoostLiteApp.instance

    Scaffold(
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                ),
                title = { Text("Post") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    val s = state
                    if (s is UiState.Success && s.data.post.media.downloadUrl != null) {
                        IconButton(onClick = {
                            val post = s.data.post
                            post.media.downloadUrl?.let { url ->
                                app.downloader.enqueue(
                                    url = url,
                                    subreddit = post.subreddit,
                                    title = post.title,
                                )
                            }
                        }) {
                            Icon(Icons.Filled.Download, contentDescription = "Download")
                        }
                    }
                },
            )
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is UiState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
                is UiState.Error -> ErrorState(
                    message = s.message,
                    needsCookies = s.needsCookies,
                    onImportCookies = onBack,
                    onRetry = { viewModel.load(permalink) },
                )
                is UiState.Success -> {
                    val post = s.data.post
                    val comments = s.data.comments
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 24.dp),
                    ) {
                        item {
                            Column(Modifier.fillMaxWidth().padding(12.dp)) {
                                Text(
                                    text = "r/${post.subreddit}  •  u/${post.author}  •  ${relativeTime(post.createdUtc)}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Spacer(Modifier.size(6.dp))
                                Text(
                                    text = post.title,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                            MediaContent(post = post, modifier = Modifier.fillMaxWidth())
                            if (post.media.type == MediaType.TEXT && !post.selftext.isNullOrBlank()) {
                                Text(
                                    text = post.selftext,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.padding(12.dp),
                                )
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    text = "${compactCount(post.score)} upvotes  •  ${compactCount(post.numComments)} comments",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                        }

                        if (comments.isEmpty()) {
                            item {
                                Text(
                                    text = "No comments loaded.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(16.dp),
                                )
                            }
                        } else {
                            items(comments, key = { it.id }) { comment ->
                                CommentItem(comment)
                                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                            }
                        }
                    }
                }
            }
        }
    }
}
