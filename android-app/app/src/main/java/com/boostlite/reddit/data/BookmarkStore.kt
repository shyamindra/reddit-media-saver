package com.boostlite.reddit.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class BookmarkStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val _names = MutableStateFlow(load())
    val names: StateFlow<List<String>> = _names.asStateFlow()

    fun isStarred(name: String): Boolean = BookmarkNames.isStarred(_names.value, name)

    fun add(name: String): Boolean {
        val (ok, next) = BookmarkNames.add(_names.value, name)
        if (ok) persist(next)
        return ok
    }

    fun remove(name: String) {
        persist(BookmarkNames.remove(_names.value, name))
    }

    fun toggle(name: String): Boolean {
        val result = BookmarkNames.toggle(_names.value, name)
        persist(result.names)
        return result.starred
    }

    fun joinedForFeed(): String? = BookmarkNames.joinedForFeed(_names.value)

    private fun load(): List<String> {
        val raw = prefs.getString(KEY, "").orEmpty()
        if (raw.isBlank()) return emptyList()
        return raw.split('\u001f').mapNotNull { BookmarkNames.normalize(it) }
    }

    private fun persist(names: List<String>) {
        prefs.edit().putString(KEY, names.joinToString("\u001f")).apply()
        _names.value = names
    }

    companion object {
        private const val PREFS = "boostlite_bookmarks"
        private const val KEY = "sub_names"
    }
}
