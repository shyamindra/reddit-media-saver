/**
 * PROTOTYPE (throwaway) — TUI shell over androidCookieBrowse/model.ts
 *
 * Run: npm run prototype:android-cookie-browse
 */

import readline from 'node:readline';
import { DEMO, initialState, reduce, type PrototypeState } from './model';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function render(state: PrototypeState): void {
  console.clear();
  const proven = state.featuresProven;
  const provenBits = [
    proven.subFeed ? 'feed' : 'feed?',
    proven.globalSearch ? 'gsearch' : 'gsearch?',
    proven.subSearch ? 'ssearch' : 'ssearch?',
    proven.comments ? 'comments' : 'comments?',
    proven.download ? 'dl' : 'dl?',
  ].join(' ');

  console.log(`${BOLD}Android browse session sources (PROTOTYPE)${RESET}`);
  console.log(`${DIM}Desktop mode ≠ cookie access · compare [m]/[e]/[i]/[v]/[h]${RESET}`);
  console.log('');
  console.log(`${BOLD}phase${RESET}              ${state.phase}`);
  console.log(`${BOLD}sessionSource${RESET}     ${state.sessionSource}`);
  console.log(`${BOLD}view${RESET}               ${state.view}`);
  console.log(`${BOLD}hasCookies${RESET}         ${state.hasCookies}`);
  console.log(`${BOLD}webViewOpen${RESET}        ${state.webViewOpen}`);
  console.log(
    `${BOLD}cookieAgeHours${RESET}    ${state.cookieAgeHours}/${state.cookieMaxHours}`,
  );
  console.log(
    `${BOLD}requests/min${RESET}      ${state.requestsThisMinute}/${state.softLimitPerMinute}`,
  );
  console.log(`${BOLD}rateLimitWait${RESET}     ${state.rateLimitWaitTicksLeft}`);
  console.log(`${BOLD}failures${RESET}           ${state.consecutiveFailures}`);
  console.log(`${BOLD}currentSub${RESET}         ${state.currentSub ?? '—'}`);
  console.log(`${BOLD}currentQuery${RESET}      ${state.currentQuery ?? '—'}`);
  console.log(`${BOLD}feedItemCount${RESET}     ${state.feedItemCount}`);
  console.log(`${BOLD}commentsLoaded${RESET}    ${state.commentsLoaded}`);
  console.log(
    `${BOLD}downloads${RESET}          ok=${state.downloadsOk} fail=${state.downloadsFailed}`,
  );
  console.log(
    `${BOLD}triedAnon/steal${RESET}   anon=${state.triedAnonymous}/${state.anonymousBlocked} steal=${state.triedAndroidBrowserAuto}/${state.androidBrowserAutoBlocked}`,
  );
  console.log(`${BOLD}featuresProven${RESET}    ${provenBits}`);
  console.log('');
  console.log(`${BOLD}approach cheat-sheet${RESET}`);
  console.log(`  ${DIM}steal browser${RESET}   ${state.approachRanks.stealBrowserCookies}`);
  console.log(`  ${DIM}anonymous${RESET}       ${state.approachRanks.anonymous}`);
  console.log(`  ${DIM}desktop import${RESET}  ${state.approachRanks.desktopImport}`);
  console.log(`  ${DIM}android export${RESET}  ${state.approachRanks.androidExport}`);
  console.log(`  ${DIM}in-app WebView${RESET}  ${state.approachRanks.webViewSession}`);
  console.log(`  ${DIM}share-intent${RESET}    ${state.approachRanks.shareIntent}`);
  console.log('');
  console.log(`${BOLD}feasibility${RESET}       ${state.feasibility}`);
  console.log(`${DIM}${state.feasibilityNote}${RESET}`);
  console.log('');
  console.log(`${BOLD}lastEvent${RESET}`);
  console.log(`  ${state.lastEvent}`);
  console.log('');
  console.log(
    `${BOLD}[a]${RESET}${DIM} anon  ${RESET}` +
      `${BOLD}[m]${RESET}${DIM} steal Android browser  ${RESET}` +
      `${BOLD}[e]${RESET}${DIM} Android Firefox export  ${RESET}` +
      `${BOLD}[i]${RESET}${DIM} desktop import${RESET}`,
  );
  console.log(
    `${BOLD}[v]${RESET}${DIM} WebView  ${RESET}` +
      `${BOLD}[u]${RESET}${DIM} WebView guest  ${RESET}` +
      `${BOLD}[c]${RESET}${DIM} capture WebView cookies  ${RESET}` +
      `${BOLD}[h]${RESET}${DIM} share-intent${RESET}`,
  );
  console.log(
    `${BOLD}[f]${RESET}${DIM} feed  ${RESET}` +
      `${BOLD}[g]${RESET}${DIM} gsearch  ${RESET}` +
      `${BOLD}[s]${RESET}${DIM} ssearch  ${RESET}` +
      `${BOLD}[p]${RESET}${DIM} post  ${RESET}` +
      `${BOLD}[d]${RESET}${DIM} download  ${RESET}` +
      `${BOLD}[t]${RESET}${DIM} +1h  ${RESET}` +
      `${BOLD}[w]${RESET}${DIM} wait  ${RESET}` +
      `${BOLD}[x]${RESET}${DIM} block  ${RESET}` +
      `${BOLD}[q]${RESET}${DIM} quit${RESET}`,
  );
}

function handleKey(state: PrototypeState, key: string): PrototypeState | 'quit' {
  switch (key) {
    case 'a':
      return reduce(state, { type: 'TRY_ANONYMOUS' });
    case 'm':
      return reduce(state, { type: 'TRY_ANDROID_BROWSER_AUTO' });
    case 'e':
      return reduce(state, { type: 'IMPORT_ANDROID_FIREFOX_EXPORT' });
    case 'i':
      return reduce(state, { type: 'IMPORT_DESKTOP_FIREFOX' });
    case 'v':
      return reduce(state, { type: 'OPEN_IN_APP_WEBVIEW' });
    case 'u':
      return reduce(state, { type: 'WEBVIEW_GUEST_BROWSE' });
    case 'c':
      return reduce(state, { type: 'WEBVIEW_CAPTURE_SESSION' });
    case 'h':
      return reduce(state, { type: 'ENABLE_SHARE_INTENT' });
    case 'f':
      return reduce(state, { type: 'OPEN_SUB_FEED', sub: DEMO.DEFAULT_SUB });
    case 'g':
      return reduce(state, { type: 'GLOBAL_SEARCH', query: DEMO.DEFAULT_QUERY });
    case 's':
      return reduce(state, { type: 'SUB_SEARCH', query: DEMO.DEFAULT_QUERY });
    case 'p':
      return reduce(state, { type: 'OPEN_POST' });
    case 'd':
      return reduce(state, { type: 'DOWNLOAD_MEDIA' });
    case 't':
      return reduce(state, { type: 'TICK_HOUR' });
    case 'w':
      return reduce(state, { type: 'WAIT_RATE_LIMIT' });
    case 'x':
      return reduce(state, { type: 'SIMULATE_HARD_BLOCK' });
    case 'q':
    case '\u0003':
      return 'quit';
    default:
      return {
        ...state,
        lastEvent: `Unknown key "${key}". Use the shortcuts listed below.`,
      };
  }
}

function main(): void {
  let state = initialState();
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  render(state);

  process.stdin.on('keypress', (_str, key) => {
    if (!key) return;
    const next = handleKey(state, key.name ?? key.sequence ?? '');
    if (next === 'quit') {
      console.clear();
      console.log('Prototype quit.');
      console.log(`Final feasibility: ${state.feasibility}`);
      console.log(state.feasibilityNote);
      process.exit(0);
    }
    state = next;
    render(state);
  });
}

main();
