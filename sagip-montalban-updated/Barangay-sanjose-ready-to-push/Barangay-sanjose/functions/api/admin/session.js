import {
  COOKIE_NAME,
  json,
  parseCookie,
  readAdminConfig,
  verifySessionToken,
} from '../../_lib/admin.js';

/**
 * GET /api/admin/session
 *
 * Tells the client whether the server-side proxy is configured and whether the
 * current browser holds a valid session. It never returns the credential — only
 * a boolean and the expiry of the HttpOnly cookie.
 */
export function onRequestGet({ request, env }) {
  const config = readAdminConfig(env);
  if (!config.configured) {
    return json({ proxy: false, authenticated: false, reason: 'server_not_configured' });
  }
  return verifySessionToken(config.sessionSecret, parseCookie(request, COOKIE_NAME)).then(
    (expiresAt) =>
      json({
        proxy: true,
        authenticated: Boolean(expiresAt),
        expiresAt: expiresAt ?? null,
      }),
  );
}
