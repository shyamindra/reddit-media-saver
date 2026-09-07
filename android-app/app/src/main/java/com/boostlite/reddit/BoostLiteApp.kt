package com.boostlite.reddit

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import coil.request.CachePolicy
import com.boostlite.reddit.data.ArchiveClient
import com.boostlite.reddit.data.CookieStore
import com.boostlite.reddit.data.FeedTargetStore
import com.boostlite.reddit.data.JsonGetter
import com.boostlite.reddit.data.PrefsStarredSubsPersist
import com.boostlite.reddit.data.RedditClient
import com.boostlite.reddit.data.RedditRepository
import com.boostlite.reddit.data.UserHistory
import com.boostlite.reddit.download.MediaDownloader

/**
 * Poor-man's DI: build the singletons once and hand them to ViewModels via a
 * small service locator. Fine for a prototype; swap for Hilt if this grows.
 */
class BoostLiteApp : Application(), ImageLoaderFactory {

    lateinit var cookieStore: CookieStore
        private set
    lateinit var feedTarget: FeedTargetStore
        private set
    lateinit var redditClient: RedditClient
        private set
    lateinit var repository: RedditRepository
        private set
    lateinit var userHistory: UserHistory
        private set
    lateinit var downloader: MediaDownloader
        private set

    override fun onCreate() {
        super.onCreate()
        cookieStore = CookieStore(this)
        feedTarget = FeedTargetStore(PrefsStarredSubsPersist(this))
        redditClient = RedditClient(cookieStore)
        repository = RedditRepository(redditClient)
        val archiveClient = ArchiveClient()
        userHistory = UserHistory(
            livePosts = { name, sort, time, after ->
                repository.userSubmitted(name, sort, time, after)
            },
            liveComments = { name, sort, time, after ->
                repository.userComments(name, sort, time, after)
            },
            archiveGet = JsonGetter { archiveClient.getJson(it) },
        )
        downloader = MediaDownloader(this, redditClient)
        instance = this
    }

    /**
     * Coil loads Reddit preview images with the same Cookie + UA as JSON.
     */
    override fun newImageLoader(): ImageLoader {
        return ImageLoader.Builder(this)
            .okHttpClient(redditClient.http)
            .crossfade(true)
            .memoryCachePolicy(CachePolicy.ENABLED)
            .diskCachePolicy(CachePolicy.ENABLED)
            .components {
                if (android.os.Build.VERSION.SDK_INT >= 28) {
                    add(ImageDecoderDecoder.Factory())
                } else {
                    add(GifDecoder.Factory())
                }
            }
            .build()
    }

    companion object {
        lateinit var instance: BoostLiteApp
            private set
    }
}
