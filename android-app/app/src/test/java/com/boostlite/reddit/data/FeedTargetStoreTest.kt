package com.boostlite.reddit.data

import com.boostlite.reddit.data.model.FeedTarget
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FeedTargetStoreTest {

    private fun store(vararg starred: String) =
        FeedTargetStore(MemoryStarredSubsPersist(starred.toList()))

    @Test
    fun coldStart_starredWhenNamesExist() {
        val ft = store("pics")
        assertEquals(FeedTarget.Starred, ft.target.value)
        assertEquals("pics", ft.listingSubreddit())
    }

    @Test
    fun coldStart_allWhenEmpty() {
        val ft = store()
        assertEquals(FeedTarget.All, ft.target.value)
        assertEquals("all", ft.listingSubreddit())
    }

    @Test
    fun openStarred_emptyDemotesToAll() {
        val ft = store()
        ft.openStarred()
        assertEquals(FeedTarget.All, ft.target.value)
    }

    @Test
    fun openSub_stripsPrefix() {
        val ft = store()
        ft.openSub("r/Cats")
        assertEquals(FeedTarget.Sub("Cats"), ft.target.value)
        assertEquals("Cats", ft.listingSubreddit())
    }

    @Test
    fun openSub_allAlias() {
        val ft = store("pics")
        ft.openSub("r/all")
        assertEquals(FeedTarget.All, ft.target.value)
    }

    @Test
    fun star_caseInsensitivePreservesFirstSpelling() {
        val ft = store()
        assertTrue(ft.star("Cats"))
        assertFalse(ft.star("cats"))
        assertEquals(listOf("Cats"), ft.starredNames.value)
    }

    @Test
    fun star_capsAt20() {
        val ft = store(*(1..20).map { "sub$it" }.toTypedArray())
        assertFalse(ft.star("extra"))
        assertEquals(20, ft.starredNames.value.size)
    }

    @Test
    fun toggleStar_addThenRemove() {
        val ft = store()
        assertTrue(ft.toggleStar("pics"))
        assertEquals(listOf("pics"), ft.starredNames.value)
        assertFalse(ft.toggleStar("pics"))
        assertTrue(ft.starredNames.value.isEmpty())
    }

    @Test
    fun unstarLast_demotesStarredToAll() {
        val ft = store("pics")
        assertEquals(FeedTarget.Starred, ft.target.value)
        ft.unstar("pics")
        assertEquals(FeedTarget.All, ft.target.value)
        assertEquals("all", ft.listingSubreddit())
    }

    @Test
    fun listing_combined() {
        val ft = store("a", "b")
        assertEquals("a+b", ft.listingSubreddit())
    }

    @Test
    fun star_rejectsAllAliasAndFrontpage() {
        val ft = store()
        assertFalse(ft.star("all"))
        assertFalse(ft.star("r/all"))
        assertFalse(ft.star("frontpage"))
        assertFalse(ft.star("  "))
        assertTrue(ft.starredNames.value.isEmpty())
    }

    @Test
    fun openSub_invalidLeavesTarget() {
        val ft = store()
        ft.openSub("frontpage")
        assertEquals(FeedTarget.All, ft.target.value)
        ft.openSub("  ")
        assertEquals(FeedTarget.All, ft.target.value)
    }

    @Test
    fun openUser_stripsPrefixAndPushes() {
        val ft = store("pics")
        ft.openUser("u/spez")
        assertEquals(FeedTarget.User("spez"), ft.target.value)
        assertTrue(ft.goBack())
        assertEquals(FeedTarget.Starred, ft.target.value)
    }

    @Test
    fun openUser_deletedIsNoOp() {
        val ft = store()
        ft.openUser("[deleted]")
        assertEquals(FeedTarget.All, ft.target.value)
    }

    @Test
    fun persist_roundTrip() {
        val persist = MemoryStarredSubsPersist()
        val first = FeedTargetStore(persist)
        first.star("pics")
        val second = FeedTargetStore(persist)
        assertEquals(listOf("pics"), second.starredNames.value)
        assertEquals(FeedTarget.Starred, second.target.value)
    }

    @Test
    fun persist_restoresLastSub() {
        val persist = MemoryStarredSubsPersist(listOf("pics"))
        val first = FeedTargetStore(persist)
        first.openSub("cats")
        val second = FeedTargetStore(persist)
        assertEquals(FeedTarget.Sub("cats"), second.target.value)
    }

    @Test
    fun goBack_fromSub_returnsHome() {
        val ft = store("pics")
        assertEquals(FeedTarget.Starred, ft.target.value)
        ft.openSub("cats")
        assertEquals(FeedTarget.Sub("cats"), ft.target.value)
        assertTrue(ft.canGoBack())
        assertTrue(ft.goBack())
        assertEquals(FeedTarget.Starred, ft.target.value)
        assertFalse(ft.canGoBack())
        assertFalse(ft.goBack())
    }

    @Test
    fun goBack_popsThroughSubsThenHome() {
        val ft = store("pics")
        ft.openSub("a")
        ft.openSub("b")
        assertTrue(ft.goBack())
        assertEquals(FeedTarget.Sub("a"), ft.target.value)
        assertTrue(ft.goBack())
        assertEquals(FeedTarget.Starred, ft.target.value)
    }

    @Test
    fun openAll_clearsStack_thenBackGoesHome() {
        val ft = store("pics")
        ft.openSub("cats")
        ft.openAll()
        assertEquals(FeedTarget.All, ft.target.value)
        assertTrue(ft.canGoBack())
        assertTrue(ft.goBack())
        assertEquals(FeedTarget.Starred, ft.target.value)
        assertFalse(ft.canGoBack())
    }

    @Test
    fun goBack_subWithNoStarred_goesToAll() {
        val ft = store()
        ft.openSub("cats")
        assertTrue(ft.goBack())
        assertEquals(FeedTarget.All, ft.target.value)
        assertFalse(ft.canGoBack())
    }
}
