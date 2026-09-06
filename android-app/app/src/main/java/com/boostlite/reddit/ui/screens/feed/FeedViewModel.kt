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
import com.boostlite.reddit.data.model.SearchTime
import com.boostlite.reddit.ui.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

class FeedViewModel(app: Application) : AndroidViewModel(app) {

    private val boost = app as BoostLiteApp
    private val repo = boost.repository
    private val feedTarget = boost.feedTarget

    val target: StateFlow<FeedTarget> = feedTarget.target
    val starredNames: StateFlow<List<String>> = feedTarget.starredNames

    private val _sort = MutableStateFlow(FeedSort.HOT)
    val sort: StateFlow<FeedSort> = _sort.asStateFlow()

    private val _time = MutableStateFlow(SearchTime.ALL)
    val time: StateFlow<SearchTime> = _time.asStateFlow()

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
            combine(boost.cookieStore.cookieHeader, feedTarget.target, feedTarget.starredNames) { _, _, _ ->
            }.collect { load() }
        }
    }

    fun searchSubArg(): String? = (feedTarget.target.value as? FeedTarget.Sub)?.name

    fun isCurrentSubStarred(): Boolean {
        val t = feedTarget.target.value
        return t is FeedTarget.Sub && feedTarget.isStarred(t.name)
    }

    fun toggleCurrentStar(): Boolean? {
        val t = feedTarget.target.value as? FeedTarget.Sub ?: return null
        return feedTarget.toggleStar(t.name)
    }

    fun unstar(name: String) = feedTarget.unstar(name)

    fun openStarred() = feedTarget.openStarred()
    fun openAll() = feedTarget.openAll()
    fun openSub(name: String) = feedTarget.openSub(name)

    fun canGoBack(): Boolean = feedTarget.canGoBack()
    fun goBack(): Boolean = feedTarget.goBack()

    fun goToSubreddit(raw: String) = feedTarget.openSub(raw)

    fun setSort(sort: FeedSort) {
        _sort.value = sort
        load()
    }

    fun setTime(time: SearchTime) {
        if (_time.value == time) return
        _time.value = time
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

    private fun fetch(reset: Boolean) {
        viewModelScope.launch {
            try {
                val listing = repo.feed(
                    feedTarget.listingSubreddit(),
                    _sort.value,
                    time = _time.value.path,
                    after = after,
                )
                if (reset) loaded.clear()
                loaded.addAll(listing.items)
                after = listing.after
                _state.value = UiState.Success(loaded.toList())
            } catch (e: SessionExpiredException) {
                if (loaded.isEmpty()) {
                    _state.value = UiState.Error(e.message ?: "Session expired", needsCookies = true)
                }
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
