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

    override fun loadLastTarget(): String? = prefs.getString(KEY_TARGET, null)

    override fun saveLastTarget(encoded: String) {
        prefs.edit().putString(KEY_TARGET, encoded).apply()
    }

    companion object {
        private const val PREFS = "boostlite_bookmarks"
        private const val KEY = "sub_names"
        private const val KEY_TARGET = "last_target"
    }
}
