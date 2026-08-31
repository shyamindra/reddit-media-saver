/**
 * PROTOTYPE (throwaway) — pure logic for Android cookie-browse feasibility.
 *
 * Question: For a personal Android client (feeds/subs/comments/search + download,
 * no voting/inbox, no on-device Reddit login UI preferred), which session sources
 * actually work — and does “desktop site” in the Android browser unlock cookies
 * for our app?
 *
 * Key finding modeled here: desktop mode only changes User-Agent. It does NOT
 * let another app read Firefox/Chrome cookie storage (sandbox). Manual export
 * from Firefox Android, or an in-app WebView session, can still supply cookies.
 */

export type Phase =
  | 'no_session'
  | 'session_ready'
  | 'browsing'
  | 'rate_limited'
  | 'session_expired'
  | 'blocked'
  | 'share_only';

export type View = 'none' | 'sub_feed' | 'global_search' | 'sub_search' | 'post';

export type SessionSource =
  | 'none'
  | 'desktop_firefox_file'
  | 'android_firefox_manual_export'
  | 'in_app_webview'
  | 'share_intent';

export type Feasibility =
  | 'unknown'
  | 'not_viable_anonymous'
  | 'not_viable_steal_browser_cookies'
  | 'viable_personal_fragile'
  | 'viable_share_download_only'
  | 'dead_without_cookie_refresh';

export type Action =
  | { type: 'TRY_ANONYMOUS' }
  | { type: 'TRY_ANDROID_BROWSER_AUTO' } // desktop-site myth
  | { type: 'IMPORT_DESKTOP_FIREFOX' }
  | { type: 'IMPORT_ANDROID_FIREFOX_EXPORT' }
  | { type: 'OPEN_IN_APP_WEBVIEW' }
  | { type: 'WEBVIEW_GUEST_BROWSE' }
  | { type: 'WEBVIEW_CAPTURE_SESSION' } // implies user already had/ got a session in WebView
  | { type: 'ENABLE_SHARE_INTENT' }
  | { type: 'OPEN_SUB_FEED'; sub: string }
  | { type: 'GLOBAL_SEARCH'; query: string }
  | { type: 'SUB_SEARCH'; query: string }
  | { type: 'OPEN_POST' }
  | { type: 'DOWNLOAD_MEDIA' }
  | { type: 'TICK_HOUR' }
  | { type: 'WAIT_RATE_LIMIT' }
  | { type: 'SIMULATE_HARD_BLOCK' };

export interface PrototypeState {
  phase: Phase;
  view: View;
  sessionSource: SessionSource;
  hasCookies: boolean;
  cookieAgeHours: number;
  cookieMaxHours: number;
  requestsThisMinute: number;
  softLimitPerMinute: number;
  rateLimitWaitTicksLeft: number;
  consecutiveFailures: number;
  currentSub: string | null;
  currentQuery: string | null;
  feedItemCount: number;
  commentsLoaded: boolean;
  downloadsOk: number;
  downloadsFailed: number;
  triedAnonymous: boolean;
  anonymousBlocked: boolean;
  triedAndroidBrowserAuto: boolean;
  androidBrowserAutoBlocked: boolean;
  webViewOpen: boolean;
  featuresProven: {
    subFeed: boolean;
    globalSearch: boolean;
    subSearch: boolean;
    comments: boolean;
    download: boolean;
  };
  approachRanks: {
    desktopImport: string;
    androidExport: string;
    webViewSession: string;
    shareIntent: string;
    stealBrowserCookies: string;
    anonymous: string;
  };
  lastEvent: string;
  feasibility: Feasibility;
  feasibilityNote: string;
}

const DEFAULT_SUB = 'WatchItForThePlot';
const DEFAULT_QUERY = 'scene';

const APPROACH_BASE = {
  desktopImport: 'ok — file/QR from PC (what this repo already does)',
  androidExport: 'better UX — export Netscape on-phone via Firefox add-on, import into app',
  webViewSession: 'best continuity — CookieManager lives in YOUR app (needs a session somehow)',
  shareIntent: 'simpler — browse in real browser, share URL to app for download only',
  stealBrowserCookies: 'dead — Android sandbox; desktop mode does not help',
  anonymous: 'dead — unauthenticated *.json → 403 (~May 2026)',
};

export function initialState(): PrototypeState {
  return {
    phase: 'no_session',
    view: 'none',
    sessionSource: 'none',
    hasCookies: false,
    cookieAgeHours: 0,
    cookieMaxHours: 72,
    requestsThisMinute: 0,
    softLimitPerMinute: 5,
    rateLimitWaitTicksLeft: 0,
    consecutiveFailures: 0,
    currentSub: null,
    currentQuery: null,
    feedItemCount: 0,
    commentsLoaded: false,
    downloadsOk: 0,
    downloadsFailed: 0,
    triedAnonymous: false,
    anonymousBlocked: false,
    triedAndroidBrowserAuto: false,
    androidBrowserAutoBlocked: false,
    webViewOpen: false,
    featuresProven: {
      subFeed: false,
      globalSearch: false,
      subSearch: false,
      comments: false,
      download: false,
    },
    approachRanks: { ...APPROACH_BASE },
    lastEvent:
      'Compare sources: [a]anon [m]steal Android browser (desktop mode) [e]Android export [i]desktop import [v]WebView [h]share-intent',
    feasibility: 'unknown',
    feasibilityNote: 'Not enough evidence yet.',
  };
}

function deriveFeasibility(state: PrototypeState): Pick<PrototypeState, 'feasibility' | 'feasibilityNote'> {
  if (state.phase === 'share_only') {
    return {
      feasibility: 'viable_share_download_only',
      feasibilityNote:
        'Share-intent works without app session cookies, but in-app feeds/search/comments are out of scope.',
    };
  }

  if (state.androidBrowserAutoBlocked && !state.hasCookies && state.sessionSource === 'none') {
    return {
      feasibility: 'not_viable_steal_browser_cookies',
      feasibilityNote:
        'Cannot auto-read Firefox/Chrome cookies. Desktop site only flips UA. Use manual export [e], desktop import [i], or in-app WebView [v].',
    };
  }

  if (state.anonymousBlocked && !state.hasCookies) {
    return {
      feasibility: 'not_viable_anonymous',
      feasibilityNote:
        'Anonymous *.json returns 403. Need a session cookie from somewhere — not on-device login UI necessarily, but a session.',
    };
  }

  const proven =
    state.featuresProven.subFeed &&
    state.featuresProven.globalSearch &&
    state.featuresProven.subSearch &&
    state.featuresProven.comments &&
    state.featuresProven.download;

  if (state.phase === 'blocked') {
    return {
      feasibility: 'dead_without_cookie_refresh',
      feasibilityNote: 'Hard block. Fresh cookies or share-intent fallback.',
    };
  }

  if (state.phase === 'session_expired') {
    return {
      feasibility: 'dead_without_cookie_refresh',
      feasibilityNote:
        state.sessionSource === 'android_firefox_manual_export'
          ? 'Expired. Re-export from Firefox Android [e] (same phone — better than needing a PC).'
          : state.sessionSource === 'in_app_webview'
            ? 'Expired. Re-open WebView and refresh Reddit session [v]/[c].'
            : 'Expired. Re-import from desktop Firefox [i].',
    };
  }

  if (proven && state.hasCookies) {
    const via =
      state.sessionSource === 'android_firefox_manual_export'
        ? 'Android Firefox manual export'
        : state.sessionSource === 'in_app_webview'
          ? 'in-app WebView CookieManager'
          : 'desktop Firefox file import';
    return {
      feasibility: 'viable_personal_fragile',
      feasibilityNote: `Full browse+download proven via ${via}. Fragile personally; not a public app.`,
    };
  }

  if (state.hasCookies) {
    return {
      feasibility: 'unknown',
      feasibilityNote: 'Session ready. Prove feed, both searches, comments, download ([f][g][s][p][d]).',
    };
  }

  return {
    feasibility: 'unknown',
    feasibilityNote: 'Pick a session source ([e]/[i]/[v]/[h]) or disprove myths ([a]/[m]).',
  };
}

function withDerived(state: PrototypeState): PrototypeState {
  return { ...state, ...deriveFeasibility(state) };
}

function activateSession(
  state: PrototypeState,
  source: SessionSource,
  event: string,
): PrototypeState {
  return withDerived({
    ...state,
    hasCookies: true,
    sessionSource: source,
    cookieAgeHours: 0,
    phase: 'session_ready',
    view: 'none',
    feedItemCount: 0,
    commentsLoaded: false,
    requestsThisMinute: 0,
    rateLimitWaitTicksLeft: 0,
    consecutiveFailures: 0,
    lastEvent: event,
  });
}

function requireSession(state: PrototypeState): PrototypeState | null {
  if (state.phase === 'share_only') {
    return withDerived({
      ...state,
      lastEvent: 'Share-intent mode: no in-app feed/search. Use [d] only after a shared post.',
    });
  }
  if (!state.hasCookies) {
    return withDerived({
      ...state,
      lastEvent: 'No session. [e] Android export, [i] desktop import, or [v]+[c] WebView — not [m].',
      consecutiveFailures: state.consecutiveFailures + 1,
    });
  }
  if (state.phase === 'session_expired') {
    return withDerived({
      ...state,
      lastEvent: 'Session expired. Re-acquire cookies for the current source.',
      consecutiveFailures: state.consecutiveFailures + 1,
    });
  }
  if (state.phase === 'blocked') {
    return withDerived({
      ...state,
      lastEvent: 'Hard-blocked. Cookie refresh may not help; try share-intent [h].',
      consecutiveFailures: state.consecutiveFailures + 1,
    });
  }
  if (state.phase === 'rate_limited') {
    return withDerived({
      ...state,
      lastEvent: `Rate limited. Wait [w] (${state.rateLimitWaitTicksLeft} tick(s) left).`,
    });
  }
  return null;
}

function bumpRequest(state: PrototypeState): PrototypeState {
  const nextCount = state.requestsThisMinute + 1;
  if (nextCount > state.softLimitPerMinute) {
    return withDerived({
      ...state,
      phase: 'rate_limited',
      requestsThisMinute: nextCount,
      rateLimitWaitTicksLeft: 2,
      lastEvent: '429 soft limit — cooldown. Same pattern as redditFetchService waits.',
      consecutiveFailures: state.consecutiveFailures + 1,
    });
  }
  return {
    ...state,
    requestsThisMinute: nextCount,
    consecutiveFailures: 0,
  };
}

export function reduce(state: PrototypeState, action: Action): PrototypeState {
  switch (action.type) {
    case 'TRY_ANONYMOUS': {
      return withDerived({
        ...state,
        triedAnonymous: true,
        anonymousBlocked: true,
        phase: state.hasCookies ? state.phase : 'no_session',
        consecutiveFailures: state.consecutiveFailures + 1,
        lastEvent:
          'Anonymous *.json → 403. Desktop mode on a browser does not create a session for our app.',
      });
    }

    case 'TRY_ANDROID_BROWSER_AUTO': {
      return withDerived({
        ...state,
        triedAndroidBrowserAuto: true,
        androidBrowserAutoBlocked: true,
        consecutiveFailures: state.consecutiveFailures + 1,
        lastEvent:
          'FAIL: cannot read org.mozilla.firefox / Chrome cookie DB (sandbox). “Request desktop site” only changes User-Agent — cookies stay inside that browser app.',
      });
    }

    case 'IMPORT_DESKTOP_FIREFOX': {
      return activateSession(
        state,
        'desktop_firefox_file',
        'OK: imported Netscape file from desktop Firefox (same as browserSessionService). Extra step: get file onto phone.',
      );
    }

    case 'IMPORT_ANDROID_FIREFOX_EXPORT': {
      return activateSession(
        state,
        'android_firefox_manual_export',
        'OK: manual Netscape export from Firefox Android (e.g. Cookie Manager add-on), then import into our app. Desktop site optional for browsing comfort — not required for export.',
      );
    }

    case 'OPEN_IN_APP_WEBVIEW': {
      return withDerived({
        ...state,
        webViewOpen: true,
        sessionSource: 'in_app_webview',
        lastEvent:
          'WebView open with desktop UA. Cookies for THIS WebView are readable via CookieManager — but guest still has no reddit_session. [c] capture after you have a session, [g] guest try.',
      });
    }

    case 'WEBVIEW_GUEST_BROWSE': {
      if (!state.webViewOpen) {
        return withDerived({
          ...state,
          lastEvent: 'Open WebView first [v].',
        });
      }
      return withDerived({
        ...state,
        triedAnonymous: true,
        anonymousBlocked: true,
        hasCookies: false,
        consecutiveFailures: state.consecutiveFailures + 1,
        lastEvent:
          'Guest WebView (even desktop UA) → still no reddit_session for *.json. Desktop mode ≠ logged in.',
      });
    }

    case 'WEBVIEW_CAPTURE_SESSION': {
      if (!state.webViewOpen) {
        return withDerived({
          ...state,
          lastEvent: 'Open WebView first [v].',
        });
      }
      return activateSession(
        state,
        'in_app_webview',
        'OK: CookieManager.getCookie("https://www.reddit.com") captured reddit_session from in-app WebView. Best refresh loop — no file shuffling. (Requires a session existing in that WebView.)',
      );
    }

    case 'ENABLE_SHARE_INTENT': {
      return withDerived({
        ...state,
        phase: 'share_only',
        sessionSource: 'share_intent',
        hasCookies: false,
        view: 'post',
        feedItemCount: 1,
        commentsLoaded: false,
        featuresProven: {
          ...state.featuresProven,
          download: false,
          subFeed: false,
          globalSearch: false,
          subSearch: false,
          comments: false,
        },
        lastEvent:
          'Share-intent mode: browse in Firefox/Chrome (desktop site fine for avoiding mobile app walls). Share post → app downloads. No in-app feed/search/comments.',
      });
    }

    case 'OPEN_SUB_FEED': {
      const blocked = requireSession(state);
      if (blocked) return blocked;
      const afterReq = bumpRequest(state);
      if (afterReq.phase === 'rate_limited') return afterReq;
      return withDerived({
        ...afterReq,
        phase: 'browsing',
        view: 'sub_feed',
        currentSub: action.sub,
        currentQuery: null,
        feedItemCount: 25,
        commentsLoaded: false,
        featuresProven: { ...afterReq.featuresProven, subFeed: true },
        lastEvent: `Sub feed ok via ${afterReq.sessionSource}: r/${action.sub}/hot.json`,
      });
    }

    case 'GLOBAL_SEARCH': {
      const blocked = requireSession(state);
      if (blocked) return blocked;
      const afterReq = bumpRequest(state);
      if (afterReq.phase === 'rate_limited') return afterReq;
      return withDerived({
        ...afterReq,
        phase: 'browsing',
        view: 'global_search',
        currentSub: null,
        currentQuery: action.query,
        feedItemCount: 20,
        commentsLoaded: false,
        featuresProven: { ...afterReq.featuresProven, globalSearch: true },
        lastEvent: `Global search ok via ${afterReq.sessionSource}`,
      });
    }

    case 'SUB_SEARCH': {
      const blocked = requireSession(state);
      if (blocked) return blocked;
      const sub = state.currentSub ?? DEFAULT_SUB;
      const afterReq = bumpRequest(state);
      if (afterReq.phase === 'rate_limited') return afterReq;
      return withDerived({
        ...afterReq,
        phase: 'browsing',
        view: 'sub_search',
        currentSub: sub,
        currentQuery: action.query,
        feedItemCount: 15,
        commentsLoaded: false,
        featuresProven: { ...afterReq.featuresProven, subSearch: true },
        lastEvent: `Sub search ok via ${afterReq.sessionSource}: r/${sub}`,
      });
    }

    case 'OPEN_POST': {
      const blocked = requireSession(state);
      if (blocked) return blocked;
      if (state.feedItemCount === 0) {
        return withDerived({
          ...state,
          lastEvent: 'No feed loaded. Open a sub [f] or search [g]/[s] first.',
        });
      }
      const afterReq = bumpRequest(state);
      if (afterReq.phase === 'rate_limited') return afterReq;
      return withDerived({
        ...afterReq,
        phase: 'browsing',
        view: 'post',
        commentsLoaded: true,
        featuresProven: { ...afterReq.featuresProven, comments: true },
        lastEvent: `Post+comments ok via ${afterReq.sessionSource}`,
      });
    }

    case 'DOWNLOAD_MEDIA': {
      if (state.phase === 'share_only') {
        return withDerived({
          ...state,
          downloadsOk: state.downloadsOk + 1,
          featuresProven: { ...state.featuresProven, download: true },
          lastEvent:
            'Download from shared URL (yt-dlp/axios may still need cookies for NSFW — share-only often falls back to exporting session anyway).',
        });
      }
      const blocked = requireSession(state);
      if (blocked) return blocked;
      if (state.view !== 'post') {
        return withDerived({
          ...state,
          lastEvent: 'Open a post [p] before downloading.',
        });
      }
      const afterReq = bumpRequest(state);
      if (afterReq.phase === 'rate_limited') return afterReq;
      return withDerived({
        ...afterReq,
        downloadsOk: afterReq.downloadsOk + 1,
        featuresProven: { ...afterReq.featuresProven, download: true },
        lastEvent: `Download ok via ${afterReq.sessionSource}`,
      });
    }

    case 'TICK_HOUR': {
      if (!state.hasCookies) {
        return withDerived({
          ...state,
          lastEvent: 'No cookies to age.',
        });
      }

      const age = state.cookieAgeHours + 1;
      const expired = age >= state.cookieMaxHours;
      const nextMinuteReset = {
        ...state,
        cookieAgeHours: age,
        requestsThisMinute: 0,
      };

      if (expired) {
        return withDerived({
          ...nextMinuteReset,
          phase: 'session_expired',
          lastEvent: `Cookie age ${age}h → expired (source=${state.sessionSource}).`,
        });
      }

      if (state.phase === 'rate_limited' && state.rateLimitWaitTicksLeft > 0) {
        const left = state.rateLimitWaitTicksLeft - 1;
        if (left <= 0) {
          return withDerived({
            ...nextMinuteReset,
            phase: 'session_ready',
            rateLimitWaitTicksLeft: 0,
            lastEvent: `+1h. Rate limit cleared. Cookie age ${age}h.`,
          });
        }
        return withDerived({
          ...nextMinuteReset,
          rateLimitWaitTicksLeft: left,
          lastEvent: `+1h. Still rate-limited (${left} left).`,
        });
      }

      return withDerived({
        ...nextMinuteReset,
        lastEvent: `+1h. Cookie age ${age}/${state.cookieMaxHours}h.`,
      });
    }

    case 'WAIT_RATE_LIMIT': {
      if (state.phase !== 'rate_limited') {
        return withDerived({
          ...state,
          lastEvent: 'Not rate-limited right now.',
        });
      }
      return withDerived({
        ...state,
        phase: 'session_ready',
        rateLimitWaitTicksLeft: 0,
        requestsThisMinute: 0,
        consecutiveFailures: 0,
        lastEvent: 'Cooldown finished.',
      });
    }

    case 'SIMULATE_HARD_BLOCK': {
      return withDerived({
        ...state,
        phase: 'blocked',
        consecutiveFailures: state.consecutiveFailures + 1,
        lastEvent: 'Hard block (403 / fingerprint).',
      });
    }

    default:
      return state;
  }
}

export const DEMO = {
  DEFAULT_SUB,
  DEFAULT_QUERY,
};
