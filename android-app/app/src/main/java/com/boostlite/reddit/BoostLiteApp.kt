package com.boostlite.reddit

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import coil.request.CachePolicy
import com.boostlite.reddit.data.CookieStore
import com.boostlite.reddit.data.RedditClient
import com.boostlite.reddit.data.RedditRepository
import com.boostlite.reddit.download.MediaDownloader
import okhttp3.OkHttpClient

/**
 * Poor-man's DI: build the singletons once and hand them to ViewModels via a
 * small service locator. Fine for a prototype; swap for Hilt if this grows.
 */
class BoostLiteApp : Application(), ImageLoaderFactory {

    lateinit var cookieStore: CookieStore
        private set
    lateinit var repository: RedditRepository
        private set
    lateinit var downloader: MediaDownloader
        private set

    override fun onCreate() {
        super.onCreate()
        cookieStore = CookieStore(this)
        repository = RedditRepository(RedditClient(cookieStore))
        downloader = MediaDownloader(this)
        instance = this
    }

    /**
     * Coil loads Reddit preview images, which require the same cookies + UA as
     * the API (i.reddit / preview.redd.it are auth-gated too).
     */
    override fun newImageLoader(): ImageLoader {
        val okHttp = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val builder = chain.request().newBuilder()
                    .header("User-Agent", RedditClient.DESKTOP_UA)
                val cookie = cookieStore.currentHeader()
                if (cookie.isNotEmpty()) builder.header("Cookie", cookie)
                chain.proceed(builder.build())
            }
            .build()
        return ImageLoader.Builder(this)
            .okHttpClient(okHttp)
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
