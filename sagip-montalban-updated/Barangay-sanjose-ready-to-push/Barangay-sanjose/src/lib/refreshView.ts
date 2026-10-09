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
