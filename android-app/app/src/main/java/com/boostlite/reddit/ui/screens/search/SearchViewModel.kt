package com.boostlite.reddit.ui.screens.search

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.data.RateLimitedException
import com.boostlite.reddit.data.SessionExpiredException
import com.boostlite.reddit.data.model.RedditPost
import com.boostlite.reddit.ui.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SearchViewModel(app: Application) : AndroidViewModel(app) {

    private val repo = (app as BoostLiteApp).repository

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    /** null = global search; non-null = restrict to this subreddit. */
    private val _restrictSub = MutableStateFlow<String?>(null)
    val restrictSub: StateFlow<String?> = _restrictSub.asStateFlow()

    private val _state = MutableStateFlow<UiState<List<RedditPost>>?>(null)
    val state: StateFlow<UiState<List<RedditPost>>?> = _state.asStateFlow()

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
            try {
                val listing = repo.search(q, subreddit = _restrictSub.value)
                _state.value = UiState.Success(listing.items)
            } catch (e: SessionExpiredException) {
                _state.value = UiState.Error(e.message ?: "Session expired", needsCookies = true)
            } catch (e: RateLimitedException) {
                _state.value = UiState.Error(e.message ?: "Rate limited")
            } catch (e: Exception) {
                _state.value = UiState.Error(e.message ?: "Search failed")
            }
        }
    }
}
