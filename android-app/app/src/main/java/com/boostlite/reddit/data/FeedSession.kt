package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.FeedTarget
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class FeedSession(private val bookmarks: BookmarkStore) {
    private val _target = MutableStateFlow(initial())
    val target: StateFlow<FeedTarget> = _target.asStateFlow()

    fun open(target: FeedTarget) {
        _target.value = when {
            target is FeedTarget.Starred && bookmarks.joinedForFeed() == null -> FeedTarget.All
            else -> target
        }
    }

    private fun initial(): FeedTarget =
        if (bookmarks.joinedForFeed() != null) FeedTarget.Starred else FeedTarget.All
}
