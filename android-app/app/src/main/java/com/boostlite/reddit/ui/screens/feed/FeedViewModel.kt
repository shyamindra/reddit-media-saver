package com.boostlite.reddit.ui.screens.feed

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.data.RateLimitedException
import com.boostlite.reddit.data.SessionExpiredException
import com.boostlite.reddit.data.model.FeedSort
import com.boostlite.reddit.data.model.RedditPost
import com.boostlite.reddit.ui.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class FeedViewModel(app: Application) : AndroidViewModel(app) {

    private val repo = (app as BoostLiteApp).repository

    private val _subreddit = MutableStateFlow("all")
    val subreddit: StateFlow<String> = _subreddit.asStateFlow()

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
            (getApplication() as BoostLiteApp).cookieStore.cookieHeader.collect {
                load()
            }
        }
    }

    fun setSubreddit(sub: String) {
        _subreddit.value = sub.trim().removePrefix("r/").removePrefix("/r/").ifBlank { "all" }
        load()
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

    private fun fetch(reset: Boolean) {
        viewModelScope.launch {
            try {
                val listing = repo.feed(_subreddit.value, _sort.value, after = after)
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
