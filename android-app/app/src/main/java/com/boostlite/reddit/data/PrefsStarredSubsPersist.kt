package com.boostlite.reddit.data

import android.content.Context

class PrefsStarredSubsPersist(context: Context) : StarredSubsPersist {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    override fun load(): List<String> {
        val raw = prefs.getString(KEY, "").orEmpty()
        if (raw.isBlank()) return emptyList()
        return raw.split('\u001f')
    }

    override fun save(names: List<String>) {
        prefs.edit().putString(KEY, names.joinToString("\u001f")).apply()
    }

    companion object {
        private const val PREFS = "boostlite_bookmarks"
        private const val KEY = "sub_names"
    }
}
