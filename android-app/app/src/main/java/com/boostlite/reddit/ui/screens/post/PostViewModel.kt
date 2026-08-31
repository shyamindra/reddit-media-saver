package com.boostlite.reddit.ui.screens.post

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.data.RateLimitedException
import com.boostlite.reddit.data.RedditParser
import com.boostlite.reddit.data.SessionExpiredException
import com.boostlite.reddit.ui.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PostViewModel(app: Application) : AndroidViewModel(app) {

    private val repo = (app as BoostLiteApp).repository

    private val _state =
        MutableStateFlow<UiState<RedditParser.PostWithComments>>(UiState.Loading)
    val state: StateFlow<UiState<RedditParser.PostWithComments>> = _state.asStateFlow()

    private var loadedPermalink: String? = null

    fun load(permalink: String) {
        if (permalink.isBlank()) {
            _state.value = UiState.Error("No post to open")
            return
        }
        if (loadedPermalink == permalink && _state.value is UiState.Success) return
        loadedPermalink = permalink
        _state.value = UiState.Loading
        viewModelScope.launch {
            try {
                _state.value = UiState.Success(repo.postWithComments(permalink))
            } catch (e: SessionExpiredException) {
                _state.value = UiState.Error(e.message ?: "Session expired", needsCookies = true)
            } catch (e: RateLimitedException) {
                _state.value = UiState.Error(e.message ?: "Rate limited")
            } catch (e: Exception) {
                _state.value = UiState.Error(e.message ?: "Failed to load post")
            }
        }
    }
}
