package com.boostlite.reddit.ui.screens.feed

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.data.RateLimitedException
import com.boostlite.reddit.data.SessionExpiredException
import com.boostlite.reddit.data.model.FeedSort
import com.boostlite.reddit.data.model.FeedTarget
import com.boostlite.reddit.data.model.RedditPost
import com.boostlite.reddit.ui.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

class FeedViewModel(app: Application) : AndroidViewModel(app) {

    private val boost = app as BoostLiteApp
    private val repo = boost.repository
    private val bookmarks = boost.bookmarkStore
    private val session = boost.feedSession

    val target: StateFlow<FeedTarget> = session.target
    val starredNames: StateFlow<List<String>> = bookmarks.names

    private val _sort = MutableStateFlow(FeedSort.HOT)
    val sort: StateFlow<FeedSort> = _sort.asStateFlow()

    private val _state = MutableStateFlow<UiState<List<RedditPost>>>(UiState.Loading)
    val state: StateFlow<UiState<List<RedditPost>>> = _state.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _isLoadingMore = MutableStateFlow(false)
    val isLoadingMore: StateFlow<Boolean> = _isLoadingMore.asStateFlow()

    private var after: String? = null
    private val loaded = mutableListOf<RedditPost>()

    init {
        viewModelScope.launch {
            combine(boost.cookieStore.cookieHeader, session.target, bookmarks.names) { _, target, names ->
                if (target is FeedTarget.Starred && names.isEmpty()) {
                    session.open(FeedTarget.All)
                }
                target
            }.collect { load() }
        }
    }

    fun title(): String = when (val t = session.target.value) {
        is FeedTarget.Starred -> "Starred"
        is FeedTarget.All -> "r/all"
        is FeedTarget.Sub -> "r/${t.name}"
    }

    fun searchSubArg(): String? = (session.target.value as? FeedTarget.Sub)?.name

    fun isCurrentSubStarred(): Boolean {
        val t = session.target.value
        return t is FeedTarget.Sub && bookmarks.isStarred(t.name)
    }

    fun showTitleStar(): Boolean = session.target.value is FeedTarget.Sub

    fun toggleCurrentStar(): Boolean? {
        val t = session.target.value as? FeedTarget.Sub ?: return null
        return bookmarks.toggle(t.name)
    }

    fun starSub(name: String): Boolean = bookmarks.add(name)

    fun unstar(name: String) = bookmarks.remove(name)

    fun open(target: FeedTarget) = session.open(target)

    fun goToSubreddit(raw: String) {
        val name = com.boostlite.reddit.data.BookmarkNames.normalize(raw)
        when {
            name == null && raw.trim().equals("all", ignoreCase = true) -> session.open(FeedTarget.All)
            name == null && raw.trim().equals("r/all", ignoreCase = true) -> session.open(FeedTarget.All)
            name != null -> session.open(FeedTarget.Sub(name))
        }
    }

    fun setSort(sort: FeedSort) {
        _sort.value = sort
        load()
    }

    fun load() {
        after = null
        loaded.clear()
        _state.value = UiState.Loading
        fetch(reset = true)
    }

    fun refresh() {
        after = null
        _isRefreshing.value = true
        fetch(reset = true)
    }

    fun loadMore() {
        if (after == null || _isLoadingMore.value) return
        _isLoadingMore.value = true
        fetch(reset = false)
    }

    private fun listingSubreddit(): String {
        return when (val t = session.target.value) {
            is FeedTarget.Starred -> bookmarks.joinedForFeed() ?: "all"
            is FeedTarget.All -> "all"
            is FeedTarget.Sub -> t.name
        }
    }

    private fun fetch(reset: Boolean) {
        viewModelScope.launch {
            try {
                val listing = repo.feed(listingSubreddit(), _sort.value, after = after)
                if (reset) loaded.clear()
                loaded.addAll(listing.items)
                after = listing.after
                _state.value = UiState.Success(loaded.toList())
            } catch (e: SessionExpiredException) {
                _state.value = UiState.Error(e.message ?: "Session expired", needsCookies = true)
            } catch (e: RateLimitedException) {
                if (loaded.isEmpty()) {
                    _state.value = UiState.Error(e.message ?: "Rate limited")
                }
            } catch (e: Exception) {
                if (loaded.isEmpty()) {
                    _state.value = UiState.Error(e.message ?: "Something went wrong")
                }
            } finally {
                _isRefreshing.value = false
                _isLoadingMore.value = false
            }
        }
    }
}
