export type RefreshView = 'main' | 'traffic' | 'flood' | 'helpcenter' | 'weather';

const REFRESH_VIEW_KEY = 'san-jose-refresh-view';

/** Save the active map view for the upcoming full-page refresh. */
export function rememberRefreshView(view: RefreshView): void {
  try {
    window.sessionStorage.setItem(REFRESH_VIEW_KEY, view);
  } catch {
    // Keep refresh working if browser storage is unavailable.
  }
}

/** Read the view snapshot without mutating storage (safe for Strict Mode). */
export function readRefreshView(): RefreshView | null {
  try {
    const view = window.sessionStorage.getItem(REFRESH_VIEW_KEY);
    return view === 'main' || view === 'traffic' || view === 'flood' || view === 'helpcenter' || view === 'weather' ? view : null;
  } catch {
    return null;
  }
}

/** Remove the one-time snapshot after the app has initialized from it. */
export function clearRefreshView(): void {
  try {
    window.sessionStorage.removeItem(REFRESH_VIEW_KEY);
  } catch {
    // Ignore unavailable browser storage.
  }
}

const HELP_CENTER_OPEN_KEY = 'san-jose-helpcenter-open';

/**
 * Keep track of whether Help Center is the open view for this tab session.
 * Unlike the one-time snapshot above this flag stays written while Help
 * Center is open, so ANY reload — the brand Refresh, the browser's own
 * refresh, or the Pixel 7 preview's "Reload App" — lands back on Help
 * Center, which always starts by asking its filter question again. It is
 * removed the moment Help Center is left, so other views reload as before.
 */
export function rememberHelpCenterOpen(open: boolean): void {
  try {
    if (open) window.sessionStorage.setItem(HELP_CENTER_OPEN_KEY, '1');
    else window.sessionStorage.removeItem(HELP_CENTER_OPEN_KEY);
  } catch {
    // Keep the app working if browser storage is unavailable.
  }
}

/** Whether Help Center was open when this tab session last unloaded. */
export function readHelpCenterOpen(): boolean {
  try {
    return window.sessionStorage.getItem(HELP_CENTER_OPEN_KEY) === '1';
  } catch {
    return false;
  }
}
