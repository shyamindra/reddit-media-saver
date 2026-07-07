# Handoff: Post-consolidation batch maintenance (TDD slices #26–#28)

**Date:** 2026-07-05  
**Status:** in progress — batch maintenance (#26–#28), link intake (#29, #33), and repair (#30) shipped locally; #31–#32 open

> **Prior handoffs:** [2026-07-05-architecture-consolidation-progress.md](./2026-07-05-architecture-consolidation-progress.md) (core spine #9–#14), [2026-07-04-architecture-consolidation.md](./2026-07-04-architecture-consolidation.md) (planning, stale on status).

## Objective

Continue phase-2 architecture cleanup from [PRD #25](https://github.com/shyamindra/reddit-media-saver/issues/25): deepen batch maintenance, finish repair consolidation, quarantine legacy scripts, prune entry points. This session used TDD (red → green) at batch maintenance and CLI seams.

## Key decisions

| Decision | Choice |
|----------|--------|
| Batch maintenance location | `src/batchMaintenance/` — new deep module behind CLI `batch` subcommands |
| Completion ledger | First adapter parses download run logs (`SUCCESS_PATTERN` in shared compile utilities); interface allows future structured ledger |
| Dead subreddit registry | File-backed JSON at `extracted_files/dead-subreddits.json` via `appConfig.paths.deadSubredditsFile` |
| Bootstrap fallback | When registry file missing/empty, `DEAD_SUBREDDITS` bootstrap Set in `src/utils/deadSubreddits.ts` used until `batch analyze-dead` writes merged file |
| Registry cache | In-memory cache in `deadSubreddits.ts`; invalidated after non-dry-run `analyze-dead` |
| TDD seams | Batch maintenance module interface → CLI parse/execute → completion ledger / registry adapters |
| Work method | Vertical TDD cycles — one behaviour test, minimal implementation, repeat |

## Artifacts (links/paths only)

| Artifact | Location |
|----------|----------|
| Parent PRD (phase 2) | [GitHub #25](https://github.com/shyamindra/reddit-media-saver/issues/25) |
| Architecture review HTML | `/var/folders/qh/ys4c4bh94010scf0vnvm28ch0000gn/T/architecture-review-20260705-103500.html` |
| Domain glossary | `CONTEXT.md` (+ Batch maintenance, Completion ledger, Dead subreddit registry) |
| Batch maintenance module | `src/batchMaintenance/` |
| App config (dead subs path) | `src/config/appConfig.ts` → `paths.deadSubredditsFile` |
| CLI batch subcommands | `src/cli/parseCli.ts`, `src/cli/executeCli.ts`, `src/cli/help.ts` |
| Closed issues | [#26](https://github.com/shyamindra/reddit-media-saver/issues/26), [#27](https://github.com/shyamindra/reddit-media-saver/issues/27), [#28](https://github.com/shyamindra/reddit-media-saver/issues/28) |
| Open child issues | [#29](https://github.com/shyamindra/reddit-media-saver/issues/29)–[#33](https://github.com/shyamindra/reddit-media-saver/issues/33) |
| Related open | [#15](https://github.com/shyamindra/reddit-media-saver/issues/15) (repair — scope in #30), [#24](https://github.com/shyamindra/reddit-media-saver/issues/24) (sub probing — follow-up on registry) |

### CLI commands (production)

```bash
# Compile saved-post export remaining CSVs
npx tsx src/cli.ts batch compile-saved-remaining [--dry-run]
npm run compile-saved-remaining

# Compile partial subreddit retry CSV
npx tsx src/cli.ts batch compile-partial-remaining [--dry-run]
npm run compile-partial-remaining

# Refresh dead subreddit registry from logs
npx tsx src/cli.ts batch analyze-dead [--dry-run]
npm run analyze-dead-subreddits
```

### Tests (representative)

```bash
npm test -- --testPathPatterns="batchMaintenance|deadSubreddits|fileInputService|linkIntake|executeLinkBatch|appConfig|cli.test"
```

51 tests passing in that pattern as of 2026-07-07 (10 suites).

## Current state vs what's needed

### Done this session (#26–#28, TDD)

- [x] **#26** `compileSavedRemaining` module + `batch compile-saved-remaining` CLI
  - Completion ledger adapter (re-exports log parser; test in `completionLedger.test.ts`)
  - Excludes: completed post IDs, permanent failures, dead subreddits, retryable failures kept
  - Dry-run support
- [x] **#27** `compilePartialRemaining` + `batch compile-partial-remaining` CLI
  - Default partial sub order preserved; skip known-bad post ID `1o0j8p6`
- [x] **#28** Dead subreddit registry + `batch analyze-dead` CLI
  - `deadSubredditRegistry.ts`: load/save/analyze/update
  - `deadSubreddits.ts` loads file with bootstrap fallback
  - Download runner + compile use existing `shouldSkipSubreddit` call sites (now file-backed)

### Done follow-up session (#29, #33)

- [x] **#29** Link intake deepening + tests
  - `src/linkIntake/redditUrlParsers.ts` — shared `extractPostId`, `extractSubredditFromUrl`, `titleFromPostUrl`
  - `compileRemainingShared.ts` re-exports parsers from link intake (single source of truth)
  - `fileInputService.test.ts` — CSV edge cases, URL validation, post row mapping
  - `fileInputService.ts` — `resolvePath()` fixes absolute-path reads in tests and custom dirs
  - `executeLinkBatch.test.ts` — delegates to `runBatch` with skipped-failure set
- [x] **#33** Deleted orphan `redditGalleryImages.ts`; gallery edge cases live in `resolvePostMedia.test.ts`

### Done repair session (#30)

- [x] **#30** Repair module completion
  - `organizeByPattern.ts` — pattern + named-group folder organization (absorbs advanced/custom organize scripts)
  - `integrityScan.ts` — HTML/empty MP4 detection; optional ffprobe callback
  - CLI: `repair organize-by-pattern`, `repair integrity-scan`
  - Legacy scripts `organizeDownloadsAdvanced`, `organizeVideosCustom`, `checkVideoIntegrity` delegate to repair module

### Module layout (`src/batchMaintenance/`)

| File | Role |
|------|------|
| `compileSavedRemaining.ts` | Saved export → remaining CSVs |
| `compilePartialRemaining.ts` | Subreddit scrape CSVs → partial-remaining.csv |
| `completionLedger.ts` | Re-export log parser (move internals here in future) |
| `deadSubredditRegistry.ts` | Registry load/save/analyze/update |
| `*.test.ts` | Behaviour tests at module seams |

### Link intake (`src/linkIntake/` + `src/services/fileInputService.ts`)

| File | Role |
|------|------|
| `redditUrlParsers.ts` | Shared post ID, subreddit, title-from-slug parsers |
| `fileInputService.ts` | CSV read, URL validate, link batch intake |
| `*.test.ts` | CSV edge cases, parser unit tests, `executeLinkBatch` seam |

### Not done (open issues from #25)

| Slice | Issue | Notes |
|-------|-------|-------|
| ~~Link intake deepening + tests~~ | ~~[#29](https://github.com/shyamindra/reddit-media-saver/issues/29)~~ | **Done** — parsers in `linkIntake/`, `fileInputService` + `executeLinkBatch` tests |
| ~~Repair module completion~~ | ~~[#30](https://github.com/shyamindra/reddit-media-saver/issues/30)~~ | **Done** — `organize-by-pattern`, `integrity-scan` in `src/repair/` |
| Legacy extract quarantine | [#31](https://github.com/shyamindra/reddit-media-saver/issues/31) | **Next recommended** — Move `contentDownloadService` + extract scripts to `legacy/` |
| Entry-point prune | [#32](https://github.com/shyamindra/reddit-media-saver/issues/32) | Delete wrapper scripts; prune npm aliases — **blocked by #30** |
| ~~Orphan gallery util~~ | ~~[#33](https://github.com/shyamindra/reddit-media-saver/issues/33)~~ | **Done** — deleted `redditGalleryImages.ts` |

### Uncommitted work

All batch maintenance + CLI + registry changes are **local uncommitted** as of handoff. No git commit was made in this session.

## Recommended next steps

1. **Commit batch maintenance + link intake work** — suggest two commits: module (#26–#28), link intake (#29 + #33).

2. **Pick up #30 (repair completion)** — TDD per repair operation (`organize-by-pattern`, `integrity-scan`). Use `codebase-design` skill for repair interface before absorbing advanced organize scripts.

3. **Then #31–#32** — quarantine legacy extract scripts, prune npm aliases (blocked on #30).

4. **First production use of registry** (if not done yet):
   ```bash
   npx tsx src/cli.ts batch analyze-dead --dry-run   # preview
   npx tsx src/cli.ts batch analyze-dead             # write extracted_files/dead-subreddits.json
   ```

5. **Close parent #25** when slices #30–#32 complete; **close #8** when full phase-2 PRD done.

## Open questions

- Should `compileRemainingShared.ts` move fully into `batchMaintenance/` (completion ledger owns parsers)?
- Should first `analyze-dead` run auto-seed registry from bootstrap without requiring `--dry-run` preview?
- Commit strategy: one commit vs three (matches closed issues)?
- #24 (automated sub probing) — still follow-up on top of file registry; not in #28 scope

## Suggested skills for the next agent

| Skill | When |
|-------|------|
| `/tdd` or `test-driven-development` | #29 link intake — one seam per red/green cycle |
| `verification-before-completion` | Before claiming slice done — run test pattern above |
| `codebase-design` | #30 repair interface before absorbing advanced organize scripts |
| `domain-modeling` | Sharpen link intake terms in `CONTEXT.md` during #29 |
| `executing-plans` | If picking up #29 + #30 in one session |
| `requesting-code-review` | After commit, before merge |
| Parent issue | Read [#25](https://github.com/shyamindra/reddit-media-saver/issues/25) body — do not re-litigate scope |

## Quick smoke commands

```bash
# Unit tests (fast)
npm test -- --testPathPatterns="batchMaintenance|cli.test"

# Batch ops (dry-run, no writes)
npx tsx src/cli.ts batch compile-saved-remaining --dry-run
npx tsx src/cli.ts batch compile-partial-remaining --dry-run
npx tsx src/cli.ts batch analyze-dead --dry-run
```
