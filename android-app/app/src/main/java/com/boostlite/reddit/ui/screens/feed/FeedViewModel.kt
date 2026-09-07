package com.boostlite.reddit.ui.screens.feed

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.boostlite.reddit.BoostLiteApp
import com.boostlite.reddit.data.RateLimitedException
import com.boostlite.reddit.data.SessionExpiredException
import com.boostlite.reddit.data.model.FeedSort
import com.boostlite.reddit.data.model.FeedTarget
import com.boostlite.reddit.data.model.ProfileComment
import com.boostlite.reddit.data.model.RedditPost
import com.boostlite.reddit.data.model.SearchTime
import com.boostlite.reddit.data.model.UserHistoryTab
import com.boostlite.reddit.ui.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

class FeedViewModel(app: Application) : AndroidViewModel(app) {

    private val boost = app as BoostLiteApp
    private val repo = boost.repository
    private val userHistory = boost.userHistory
    private val feedTarget = boost.feedTarget

    val target: StateFlow<FeedTarget> = feedTarget.target
    val starredNames: StateFlow<List<String>> = feedTarget.starredNames

    private val _sort = MutableStateFlow(FeedSort.HOT)
    val sort: StateFlow<FeedSort> = _sort.asStateFlow()

    private val _time = MutableStateFlow(SearchTime.ALL)
    val time: StateFlow<SearchTime> = _time.asStateFlow()

    private val _historyTab = MutableStateFlow(UserHistoryTab.POSTS)
    val historyTab: StateFlow<UserHistoryTab> = _historyTab.asStateFlow()

    private val _fromArchive = MutableStateFlow(false)
    val fromArchive: StateFlow<Boolean> = _fromArchive.asStateFlow()

    private val _state = MutableStateFlow<UiState<List<RedditPost>>>(UiState.Loading)
    val state: StateFlow<UiState<List<RedditPost>>> = _state.asStateFlow()

    private val _commentState = MutableStateFlow<UiState<List<ProfileComment>>>(UiState.Loading)
    val commentState: StateFlow<UiState<List<ProfileComment>>> = _commentState.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _isLoadingMore = MutableStateFlow(false)
    val isLoadingMore: StateFlow<Boolean> = _isLoadingMore.asStateFlow()

    private var after: String? = null
    private val loadedPosts = mutableListOf<RedditPost>()
    private val loadedComments = mutableListOf<ProfileComment>()
    private var lastUserName: String? = null

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
    fun openUser(name: String) = feedTarget.openUser(name)

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

    fun setHistoryTab(tab: UserHistoryTab) {
        if (_historyTab.value == tab) return
        _historyTab.value = tab
        load()
    }

    fun load() {
        resetTabIfUserChanged()
        after = null
        loadedPosts.clear()
        loadedComments.clear()
        _fromArchive.value = false
        if (showingComments()) {
            _commentState.value = UiState.Loading
        } else {
            _state.value = UiState.Loading
        }
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

    private fun resetTabIfUserChanged() {
        val name = (feedTarget.target.value as? FeedTarget.User)?.name
        if (name != lastUserName) {
            _historyTab.value = UserHistoryTab.POSTS
            lastUserName = name
        }
    }

    private fun showingComments(): Boolean =
        feedTarget.target.value is FeedTarget.User && _historyTab.value == UserHistoryTab.COMMENTS

    private fun fetch(reset: Boolean) {
        viewModelScope.launch {
            try {
                val t = feedTarget.target.value
                when {
                    t is FeedTarget.User && _historyTab.value == UserHistoryTab.COMMENTS -> {
                        val page = userHistory.comments(
                            t.name,
                            _sort.value,
                            time = _time.value.path,
                            after = after,
                        )
                        if (reset) loadedComments.clear()
                        loadedComments.addAll(page.items)
                        after = page.after
                        _fromArchive.value = page.fromArchive
                        _commentState.value = UiState.Success(loadedComments.toList())
                    }
                    t is FeedTarget.User -> {
                        val page = userHistory.posts(
                            t.name,
                            _sort.value,
                            time = _time.value.path,
                            after = after,
                        )
                        if (reset) loadedPosts.clear()
                        loadedPosts.addAll(page.items)
                        after = page.after
                        _fromArchive.value = page.fromArchive
                        _state.value = UiState.Success(loadedPosts.toList())
                    }
                    else -> {
                        val listing = repo.feed(
                            feedTarget.listingSubreddit(),
                            _sort.value,
                            time = _time.value.path,
                            after = after,
                        )
                        if (reset) loadedPosts.clear()
                        loadedPosts.addAll(listing.items)
                        after = listing.after
                        _fromArchive.value = false
                        _state.value = UiState.Success(loadedPosts.toList())
                    }
                }
            } catch (e: SessionExpiredException) {
                setErrorIfEmpty(e.message ?: "Session expired", needsCookies = true)
            } catch (e: RateLimitedException) {
                setErrorIfEmpty(e.message ?: "Rate limited")
            } catch (e: Exception) {
                setErrorIfEmpty(e.message ?: "Something went wrong")
            } finally {
                _isRefreshing.value = false
                _isLoadingMore.value = false
            }
        }
    }

    private fun setErrorIfEmpty(message: String, needsCookies: Boolean = false) {
        if (showingComments()) {
            if (loadedComments.isEmpty()) {
                _commentState.value = UiState.Error(message, needsCookies)
            }
        } else if (loadedPosts.isEmpty()) {
            _state.value = UiState.Error(message, needsCookies)
        }
    }
}
