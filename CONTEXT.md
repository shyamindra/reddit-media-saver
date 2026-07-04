# Domain Glossary — reddit-media-saver

Terms used across architecture, PRDs, and issues.

## Link batch
A collection of Reddit post or comment URLs, typically sourced from a CSV export (`reddit-links/`). The primary input to all download workflows.

## Link intake
The module that reads, validates, and normalizes URLs from CSV files into a `Link batch`.

## Link resolution
The process of turning a Reddit URL into one or more concrete media download targets (direct image URL, video stream, gallery items). Includes deduplication and quality selection. Output type: `ResolvedMedia[]`.

## ResolvedMedia
A concrete download target produced by link resolution: direct URL, media type, optional quality label, and source post metadata for filename generation.

## Download runner
The core module that executes downloads for a `Link batch`. Accepts a strategy adapter (`ytdlp-cookies`, `ytdlp-url-list`, `axios-json`) and writes to the unified output layout.

## Download strategy
An adapter behind the download runner seam that implements a specific download mechanism (yt-dlp with Firefox cookies, yt-dlp from pre-extracted URL list, axios from Reddit JSON).

## Subreddit listing
A paginated set of post URLs from a subreddit feed (top, hot, new). Produced by the listing module and written as a CSV `Link batch`.

## Batch queue
Orchestration that runs multiple subreddit listing + download jobs with concurrency limits, cooldowns, and resume support.

## Output layout
The on-disk folder structure under `downloads/` (Images, Videos, Gifs, Media, Notes) and naming conventions (`title_subreddit.ext`).

## Browser session
Firefox (or other browser) cookies exported at runtime via yt-dlp for authenticated Reddit JSON access — no OAuth. Used by Reddit fetch and link resolution when `useCookies` is set. Session cookie file path comes from app config (`sessionCookieFile`); never committed to git.

## App config
Single source of truth for paths, auth redirect URIs, batch delays, and user-agent strings.

## Repair
Maintenance operations on already-downloaded files: organize by similarity, fix corrupted HTML-as-media, recover embedded video URLs from Notes.

## Content index
SQLite-backed metadata store for saved Reddit content (UI path). Distinct from on-disk output layout metadata JSON.

## Text archive
Persistence of post or comment body when no media is available (or media download fails). Produces one Markdown file per item with title, metadata frontmatter, and body under the output layout.

## TextArchiveInput
Structured input to the text archive module: title, body, subreddit, author, timestamps, permalink, source URL, and item type (post or comment).

## Media transcode
Post-download conversion of local GIF or GIFV files to MP4 via ffmpeg. Writes to the Videos folder in the output layout; optional deletion of originals after success.
