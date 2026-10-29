import { clearedCookie, json } from '../../_lib/admin.js';

/**
 * POST /api/admin/logout
 *
 * Drops the session cookie. The browser cannot do this itself because the
 * cookie is HttpOnly — which is exactly the point.
 */
export function onRequestPost() {
  return json({ ok: true }, 200, { 'Set-Cookie': clearedCookie() });
}
