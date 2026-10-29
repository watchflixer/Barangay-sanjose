import {
  ALLOWED_RPCS,
  COOKIE_NAME,
  callAdminRpc,
  json,
  parseCookie,
  readAdminConfig,
  verifySessionToken,
} from '../../_lib/admin.js';

/**
 * POST /api/admin/rpc
 *
 * Body: { rpc, args }
 *
 * The browser can only reach the RPCs in ALLOWED_RPCS, and only while it holds
 * a valid signed cookie. This Function adds the admin credential itself, so the
 * password is never present in a request the browser can inspect. `admin_login`
 * is deliberately absent from the allowlist: credential checks happen in
 * /api/admin/login, never by proxy.
 */
export async function onRequestPost({ request, env }) {
  const config = readAdminConfig(env);
  if (!config.configured) {
    return json({ ok: false, error: 'Admin API is not configured on this deployment.' }, 503);
  }

  const expiresAt = await verifySessionToken(config.sessionSecret, parseCookie(request, COOKIE_NAME));
  if (!expiresAt) {
    return json({ ok: false, error: 'Your admin session has expired. Sign in again.' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request body.' }, 400);
  }

  const rpc = String(body?.rpc ?? '');
  if (!ALLOWED_RPCS.has(rpc)) {
    return json({ ok: false, error: `RPC "${rpc}" is not available to the browser.` }, 403);
  }

  // Only the arguments the RPC declares are forwarded; `p_password` is injected
  // server-side and any client-supplied value is ignored.
  const incoming = body?.args && typeof body.args === 'object' ? body.args : {};
  const args = { ...incoming };
  delete args.p_password;

  try {
    const data = await callAdminRpc(config, rpc, args);
    return json({ ok: true, data, expiresAt });
  } catch (error) {
    // Never leak Supabase internals (or the credential) to the browser.
    const message =
      error?.message === 'Invalid admin password'
        ? 'The server admin credential was rejected. Check ADMIN_EMAIL / ADMIN_PASSWORD.'
        : 'The admin request could not be completed.';
    return json({ ok: false, error: message }, 502);
  }
}
