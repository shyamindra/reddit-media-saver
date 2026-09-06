package com.boostlite.reddit.ui.screens.search

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.data.RateLimitedException
import com.boostlite.reddit.data.SessionExpiredException
import com.boostlite.reddit.data.model.RedditPost
import com.boostlite.reddit.data.model.SearchSort
import com.boostlite.reddit.data.model.SearchTime
import com.boostlite.reddit.data.model.Subreddit
import com.boostlite.reddit.ui.UiState
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.launch

@OptIn(FlowPreview::class)
class SearchViewModel(app: Application) : AndroidViewModel(app) {

    private val boost = app as BoostLiteApp
    private val repo = boost.repository
    private val feedTarget = boost.feedTarget

    val starredNames = feedTarget.starredNames

    fun openSub(name: String) = feedTarget.openSub(name)
    fun openUser(name: String) = feedTarget.openUser(name)

    fun toggleStar(name: String): Boolean = feedTarget.toggleStar(name)

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    /** null = global post search; non-null = restrict posts to this subreddit. */
    private val _restrictSub = MutableStateFlow<String?>(null)
    val restrictSub: StateFlow<String?> = _restrictSub.asStateFlow()

    private val _originSub = MutableStateFlow<String?>(null)
    val originSub: StateFlow<String?> = _originSub.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _sort = MutableStateFlow(SearchSort.RELEVANCE)
    val sort: StateFlow<SearchSort> = _sort.asStateFlow()

    private val _time = MutableStateFlow(SearchTime.ALL)
    val time: StateFlow<SearchTime> = _time.asStateFlow()

    private val _suggestions = MutableStateFlow<List<Subreddit>>(emptyList())
    val suggestions: StateFlow<List<Subreddit>> = _suggestions.asStateFlow()

    private val _state = MutableStateFlow<UiState<List<RedditPost>>?>(null)
    val state: StateFlow<UiState<List<RedditPost>>?> = _state.asStateFlow()

    private var lastSubmitted: String = ""

    init {
        viewModelScope.launch {
            _query.debounce(300).collectLatest { raw ->
                val q = raw.trim()
                if (_restrictSub.value != null || q.length < 2 || q == lastSubmitted) {
                    _suggestions.value = emptyList()
                    return@collectLatest
                }
                val found = runCatching { repo.searchSubreddits(q).items }.getOrDefault(emptyList())
                if (q != _query.value.trim() || q == lastSubmitted) return@collectLatest
                _suggestions.value = found
            }
        }
    }

    fun setOriginSub(sub: String?) {
        _originSub.value = sub
        _restrictSub.value = sub
        if (sub != null) _suggestions.value = emptyList()
    }

    fun setRestrictToOrigin(restrict: Boolean) {
        val origin = _originSub.value
        _restrictSub.value = if (restrict) origin else null
        if (_restrictSub.value != null) _suggestions.value = emptyList()
        resubmitIfNeeded()
    }

    fun setQuery(q: String) {
        _query.value = q
        if (q.trim().isEmpty()) _suggestions.value = emptyList()
    }

    fun setSort(sort: SearchSort) {
        if (_sort.value == sort) return
        _sort.value = sort
        resubmitIfNeeded()
    }

    fun setTime(time: SearchTime) {
        if (_time.value == time) return
        _time.value = time
        resubmitIfNeeded()
    }

    private fun resubmitIfNeeded() {
        if (_query.value.trim().isNotEmpty() && _state.value != null) submit()
    }

    fun submit() {
        val q = _query.value.trim()
        if (q.isEmpty()) return
        lastSubmitted = q
        _suggestions.value = emptyList()
        _state.value = UiState.Loading
        viewModelScope.launch {
            try {
                val posts = repo.search(
                    q,
                    subreddit = _restrictSub.value,
                    sort = _sort.value.path,
                    time = _time.value.path,
                ).items
                _state.value = UiState.Success(posts)
            } catch (e: SessionExpiredException) {
                _state.value = UiState.Error(e.message ?: "Session expired", needsCookies = true)
            } catch (e: RateLimitedException) {
                _state.value = UiState.Error(e.message ?: "Rate limited")
            } catch (e: Exception) {
                _state.value = UiState.Error(e.message ?: "Search failed")
            }
        }
    }

    fun refresh() {
        val q = _query.value.trim()
        if (q.isEmpty() || _state.value !is UiState.Success) {
            submit()
            return
        }
        _isRefreshing.value = true
        viewModelScope.launch {
            try {
                val posts = repo.search(
                    q,
                    subreddit = _restrictSub.value,
                    sort = _sort.value.path,
                    time = _time.value.path,
                ).items
                _state.value = UiState.Success(posts)
            } catch (e: SessionExpiredException) {
                if (_state.value !is UiState.Success) {
                    _state.value = UiState.Error(e.message ?: "Session expired", needsCookies = true)
                }
            } catch (e: RateLimitedException) {
                if (_state.value !is UiState.Success) {
                    _state.value = UiState.Error(e.message ?: "Rate limited")
                }
            } catch (e: Exception) {
                if (_state.value !is UiState.Success) {
                    _state.value = UiState.Error(e.message ?: "Search failed")
                }
            } finally {
                _isRefreshing.value = false
            }
        }
    }
}
