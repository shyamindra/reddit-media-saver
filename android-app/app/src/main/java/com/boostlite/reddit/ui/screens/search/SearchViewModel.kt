package com.boostlite.reddit.ui.screens.search

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.data.RateLimitedException
import com.boostlite.reddit.data.SessionExpiredException
import com.boostlite.reddit.data.model.RedditPost
import com.boostlite.reddit.data.model.Subreddit
import com.boostlite.reddit.ui.UiState
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SearchResults(
    val communities: List<Subreddit>,
    val posts: List<RedditPost>,
)

class SearchViewModel(app: Application) : AndroidViewModel(app) {

    private val boost = app as BoostLiteApp
    private val repo = boost.repository
    private val feedTarget = boost.feedTarget

    val starredNames = feedTarget.starredNames

    fun openSub(name: String) = feedTarget.openSub(name)

    fun toggleStar(name: String): Boolean = feedTarget.toggleStar(name)

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    /** null = global post search; non-null = restrict posts to this subreddit. */
    private val _restrictSub = MutableStateFlow<String?>(null)
    val restrictSub: StateFlow<String?> = _restrictSub.asStateFlow()

    private val _state = MutableStateFlow<UiState<SearchResults>?>(null)
    val state: StateFlow<UiState<SearchResults>?> = _state.asStateFlow()

    fun setRestrictSub(sub: String?) {
        _restrictSub.value = sub
    }

    fun setQuery(q: String) {
        _query.value = q
    }

    fun submit() {
        val q = _query.value.trim()
        if (q.isEmpty()) return
        _state.value = UiState.Loading
        viewModelScope.launch {
            var communityError: Throwable? = null
            var postError: Throwable? = null
            val pair = coroutineScope {
                val communitiesDeferred = async {
                    runCatching { repo.searchSubreddits(q).items }
                        .onFailure { communityError = it }
                        .getOrNull()
                }
                val postsDeferred = async {
                    runCatching { repo.search(q, subreddit = _restrictSub.value).items }
                        .onFailure { postError = it }
                        .getOrNull()
                }
                communitiesDeferred.await() to postsDeferred.await()
            }
            val communities = pair.first
            val posts = pair.second
            if (communities == null && posts == null) {
                val e = postError ?: communityError
                _state.value = when (e) {
                    is SessionExpiredException ->
                        UiState.Error(e.message ?: "Session expired", needsCookies = true)
                    is RateLimitedException ->
                        UiState.Error(e.message ?: "Rate limited")
                    else ->
                        UiState.Error(e?.message ?: "Search failed")
                }
            } else {
                _state.value = UiState.Success(
                    SearchResults(communities.orEmpty(), posts.orEmpty()),
                )
            }
        }
    }
}
