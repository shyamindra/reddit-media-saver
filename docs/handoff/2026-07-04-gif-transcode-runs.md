# Handoff: GIF → MP4 transcode runs

**Date:** 2026-07-04  
**Status:** ready for incremental runs — bulk + catch-up complete; use commands below after new downloads

## Objective

Convert local `.gif` files from `downloads/Gifs/` to `.mp4` in `downloads/Videos/`. This handoff records the **last completed run** so a future agent can convert only **new** GIFs downloaded afterward.

Utility spec: [#18](https://github.com/shyamindra/reddit-media-saver/issues/18). Implementation: commit `b447b12`.

## Key decisions

| Decision | Choice |
|----------|--------|
| Source folder | `downloads/Gifs/` (default scan also includes `Media/`, `Videos/` — use `--source-dirs Gifs` for GIF-only) |
| Output | `downloads/Videos/{basename}.mp4` (flat, same stem as GIF) |
| Idempotency | Skips when MP4 already exists — safe to re-run anytime |
| Originals | Kept by default (`--delete-original` opt-in) |
| Dead gifv | Do not transcode HTML saves — see [2026-07-04-gifv-dead-links.md](./2026-07-04-gifv-dead-links.md) |

## Artifacts (links/paths only)

| Artifact | Location |
|----------|----------|
| Transcode module | `src/services/mediaTranscodeService.ts` |
| ffmpeg adapter | `src/adapters/ffmpegAdapter.ts` |
| CLI | `npx tsx src/cli.ts repair transcode-gifs` (alias: `npm run transcode-gifs`) |
| npm script | `npm run transcode-gifs` |
| GIF sources | `downloads/Gifs/` |
| MP4 output | `downloads/Videos/` |
| Dead gifv handoff | [2026-07-04-gifv-dead-links.md](./2026-07-04-gifv-dead-links.md) |

## Run history

### Run 1 — initial bulk (2026-07-04 ~16:43 local)

| Metric | Value |
|--------|-------|
| Command | `npm run transcode-gifs -- --source-dirs Gifs` |
| Scanned | 195 |
| Converted | 178 |
| Skipped | 17 (MP4 already existed) |
| Failed | 0 |

### Run 2 — catch-up (2026-07-04 ~22:54 local)

| Metric | Value |
|--------|-------|
| Command | `npm run transcode-gifs -- --source-dirs Gifs` |
| Scanned | 203 |
| Converted | **5** |
| Skipped | 198 |
| Failed | 0 |

**Files converted in run 2:**

| GIF | MP4 output |
|-----|------------|
| `downloads/Gifs/han sohee jeon jong seo.gif` | `downloads/Videos/han sohee jeon jong seo.mp4` |
| `downloads/Gifs/kim sejeong.gif` | `downloads/Videos/kim sejeong.mp4` |
| `downloads/Gifs/kim yoojung.gif` | `downloads/Videos/kim yoojung.mp4` |
| `downloads/Gifs/seol in ah.gif` | `downloads/Videos/seol in ah.mp4` |
| `downloads/Gifs/shin yeeun.gif` | `downloads/Videos/shin yeeun.mp4` |

### Inventory after run 2

| Location | Count |
|----------|-------|
| GIFs in `downloads/Gifs/` | 204 |
| MP4s in `downloads/Videos/` (top-level) | 1,702 |
| Pending conversion (dry-run showed DRY-RUN) | **0** |

**Watermark:** After run 2, every GIF in `Gifs/` has a matching `{basename}.mp4` in `Videos/`. Any GIF added **after** run 2 is pending until the next transcode.

### Run 3 — post partial-batch verification (2026-07-05 ~02:57 local)

| Metric | Value |
|--------|-------|
| Command | `npm run transcode-gifs -- --dry-run --source-dirs Gifs` then real run (same result) |
| Scanned | 203 |
| Converted | **0** |
| Skipped | 203 |
| Failed | 0 |

No new GIFs since run 2 (~22:54 Jul 4). Partial-remaining download batch re-saved existing GIFs (e.g. `song jihyo.gif`) but matching MP4s already existed. CLI now routes through `repair transcode-gifs` (`a896f2a`).

## Current state vs what's needed

| Done | Pending |
|------|---------|
| Transcode utility + tests | — |
| Unified CLI `repair transcode-gifs` (commit `a896f2a`) | — |
| Bulk + catch-up conversion | Re-run after each download batch |
| Dead Media `.gifv` deleted (37 files) | Download-time HTML guard — see gifv dead-links handoff |

## How to convert new GIFs (next session)

```bash
# 1. Preview what would convert (no ffmpeg writes)
npm run transcode-gifs -- --dry-run --source-dirs Gifs
# or: npx tsx src/cli.ts repair transcode-gifs --dry-run --source-dirs Gifs

# 2. Convert only files missing an MP4 (skips existing)
npm run transcode-gifs -- --source-dirs Gifs

# 3. Optional: also scan Media/Videos for stray .gif/.gifv
npm run transcode-gifs -- --dry-run
```

**Interpret dry-run output:**

- `DRY-RUN` → will convert on next real run (new GIF)
- `SKIPPED` → MP4 already exists (no action)
- `FAILED` → check error (often HTML masquerading as media)

**Find GIFs newer than last run** (if needed):

```bash
# GIFs modified after run 2 (~22:54 local Jul 4)
find downloads/Gifs -iname '*.gif' -newermt '2026-07-04 22:54'
```

Update this handoff with a new **Run N** section after each conversion batch.

## Recommended next steps

1. After `download-firefox` or subreddit queue batches, run dry-run then convert.
2. Append a new run row to this doc (scanned / converted / skipped / file list).
3. Do not re-transcode `downloads/Media/` for `.gifv` until download guard prevents HTML saves.

## Open questions

- Should `download-firefox` chain transcode automatically after batch complete?
- Delete GIF originals after successful convert (`--delete-original`) to save disk?

## Suggested skills for the next agent

| Skill | When to use |
|-------|-------------|
| `/verification-before-completion` | After transcode: dry-run shows 0 DRY-RUN, spot-check `ffprobe` on new MP4s |
| `/handoff` | Append next run section to this doc |
| `/executing-plans` | Batch download + transcode workflow |
| Related | [2026-07-04-gifv-dead-links.md](./2026-07-04-gifv-dead-links.md) |
