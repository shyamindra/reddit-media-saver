package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.FeedTarget
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Load/save starred sub names. Two adapters: prefs (app) and memory (tests). */
interface StarredSubsPersist {
    fun load(): List<String>
    fun save(names: List<String>)
    fun loadLastTarget(): String? = null
    fun saveLastTarget(encoded: String) {}
}

class MemoryStarredSubsPersist(initial: List<String> = emptyList()) : StarredSubsPersist {
    private var stored = initial.toList()
    private var lastTarget: String? = null
    override fun load(): List<String> = stored
    override fun save(names: List<String>) {
        stored = names.toList()
    }
    override fun loadLastTarget(): String? = lastTarget
    override fun saveLastTarget(encoded: String) {
        lastTarget = encoded
    }
}

/**
 * Feed target module: current listing + starred subs.
 * Persist adapters sit behind [StarredSubsPersist]; name rules stay private.
 */
class FeedTargetStore(private val persist: StarredSubsPersist) {

    private val _starredNames = MutableStateFlow(sanitize(persist.load()))
    val starredNames: StateFlow<List<String>> = _starredNames.asStateFlow()

    private val _target = MutableStateFlow(initialTarget())
    val target: StateFlow<FeedTarget> = _target.asStateFlow()

    private val stack = ArrayDeque<FeedTarget>()

    fun home(): FeedTarget = if (joined() != null) FeedTarget.Starred else FeedTarget.All

    fun canGoBack(): Boolean = stack.isNotEmpty() || _target.value is FeedTarget.Sub

    fun goBack(): Boolean {
        if (stack.isNotEmpty()) {
            _target.value = stack.removeLast()
            persistTarget()
            return true
        }
        if (_target.value != home()) {
            _target.value = home()
            persistTarget()
            return true
        }
        return false
    }

    fun listingSubreddit(): String = when (val t = _target.value) {
        is FeedTarget.Starred -> joined() ?: "all"
        is FeedTarget.All -> "all"
        is FeedTarget.Sub -> t.name
    }

    fun isStarred(name: String): Boolean = isStarredIn(_starredNames.value, name)

    fun star(name: String): Boolean {
        val (ok, next) = addTo(_starredNames.value, name)
        if (ok) write(next)
        return ok
    }

    fun unstar(name: String) {
        write(removeFrom(_starredNames.value, name))
        demoteIfEmptyStarred()
    }

    /** True if [name] is starred after the call. False means unstarred or cap reached. */
    fun toggleStar(name: String): Boolean {
        val now = if (isStarred(name)) {
            write(removeFrom(_starredNames.value, name))
            false
        } else {
            star(name)
        }
        demoteIfEmptyStarred()
        return now
    }

    fun openStarred() {
        jumpHome(if (joined() != null) FeedTarget.Starred else FeedTarget.All)
    }

    fun openAll() {
        jumpHome(FeedTarget.All)
    }

    fun openSub(raw: String) {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) return
        if (isAllAlias(trimmed)) {
            openAll()
            return
        }
        val name = normalize(trimmed) ?: return
        pushAndSet(FeedTarget.Sub(name))
    }

    private fun initialTarget(): FeedTarget {
        val saved = decodeTarget(persist.loadLastTarget())
        return saved ?: defaultTarget()
    }

    private fun defaultTarget(): FeedTarget =
        if (joined() != null) FeedTarget.Starred else FeedTarget.All

    private fun demoteIfEmptyStarred() {
        if (_target.value is FeedTarget.Starred && joined() == null) {
            _target.value = FeedTarget.All
            persistTarget()
        }
    }

    private fun persistTarget() {
        persist.saveLastTarget(encodeTarget(_target.value))
    }

    private fun pushAndSet(next: FeedTarget) {
        val cur = _target.value
        if (cur == next) return
        stack.addLast(cur)
        _target.value = next
        persistTarget()
    }

    private fun jumpHome(next: FeedTarget) {
        stack.clear()
        _target.value = next
        persistTarget()
    }

    private fun decodeTarget(encoded: String?): FeedTarget? {
        if (encoded.isNullOrBlank()) return null
        return when {
            encoded == "starred" -> if (joined() != null) FeedTarget.Starred else FeedTarget.All
            encoded == "all" -> FeedTarget.All
            encoded.startsWith("sub:") -> {
                val name = encoded.removePrefix("sub:")
                normalize(name)?.let { FeedTarget.Sub(it) }
            }
            else -> null
        }
    }

    private fun encodeTarget(target: FeedTarget): String = when (target) {
        is FeedTarget.Starred -> "starred"
        is FeedTarget.All -> "all"
        is FeedTarget.Sub -> "sub:${target.name}"
    }

    private fun joined(): String? = joinedForFeed(_starredNames.value)

    private fun write(names: List<String>) {
        persist.save(names)
        _starredNames.value = names
    }

    companion object {
        const val MAX_STARRED = 20

        internal fun normalize(raw: String): String? {
            var s = raw.trim()
            if (s.startsWith("/r/", ignoreCase = true)) s = s.substring(3)
            else if (s.startsWith("r/", ignoreCase = true)) s = s.substring(2)
            else if (s.startsWith("/")) s = s.substring(1)
            s = s.trim()
            if (s.isEmpty()) return null
            if (isAllAlias(s) || s.equals("frontpage", ignoreCase = true)) return null
            return s
        }

        private fun isAllAlias(s: String): Boolean {
            val t = s.trim()
            return t.equals("all", ignoreCase = true) ||
                t.equals("r/all", ignoreCase = true) ||
                t.equals("/r/all", ignoreCase = true)
        }

        private fun isStarredIn(names: List<String>, raw: String): Boolean {
            val n = normalize(raw) ?: return false
            return names.any { it.equals(n, ignoreCase = true) }
        }

        private fun addTo(names: List<String>, raw: String): Pair<Boolean, List<String>> {
            val n = normalize(raw) ?: return false to names
            if (isStarredIn(names, n)) return false to names
            if (names.size >= MAX_STARRED) return false to names
            return true to names + n
        }

        private fun removeFrom(names: List<String>, raw: String): List<String> {
            val n = normalize(raw) ?: return names
            return names.filterNot { it.equals(n, ignoreCase = true) }
        }

        private fun joinedForFeed(names: List<String>): String? =
            names.take(MAX_STARRED).takeIf { it.isNotEmpty() }?.joinToString("+")

        private fun sanitize(loaded: List<String>): List<String> {
            val out = ArrayList<String>()
            for (raw in loaded) {
                val n = normalize(raw) ?: continue
                if (out.none { it.equals(n, ignoreCase = true) }) out.add(n)
                if (out.size >= MAX_STARRED) break
            }
            return out
        }
    }
}
