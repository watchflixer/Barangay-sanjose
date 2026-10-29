import {
  ALLOWED_RPCS,
  COOKIE_NAME,
  callAdminRpc,
  json,
  parseCookie,
  readAdminConfig,
  readBearer,
  verifySessionToken,
} from '../../_lib/admin.js';

/**
 * POST /api/admin/rpc
 *
 * Body: { rpc, args }
 *
 * The browser can only reach the RPCs in ALLOWED_RPCS, and only while it holds
 * a valid signed cookie. `admin_login` is deliberately absent from the
 * allowlist: credential checks happen in /api/admin/login, never by proxy.
 *
 * When the request also carries a Supabase Auth token, that token is forwarded
 * and no password is sent — PostgREST then runs `assert_admin()` as the
 * signed-in admin, which enforces the allow-list and `aal2`. Without a token
 * the legacy credential is injected server-side instead.
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

  const bearer = readBearer(request);

  try {
    const data = await callAdminRpc(config, rpc, args, bearer);
    return json({ ok: true, data, expiresAt });
  } catch (error) {
    if (error?.status === 401) {
      // PostgREST rejected the forwarded token: expired, revoked or forged.
      return json({ ok: false, error: 'Your admin sign-in has expired. Sign in again.' }, 401);
    }
    // Never leak Supabase internals (or the credential) to the browser.
    const raw = String(error?.message ?? '');
    const message = raw.includes('MFA verification is required')
      ? 'Two-factor verification is required for this action. Sign in again.'
      : raw.includes('not on the admin allow-list')
        ? 'This account is not allowed to manage the dashboard.'
        : raw === 'Invalid admin password'
          ? 'The server admin credential was rejected. Check ADMIN_EMAIL / ADMIN_PASSWORD.'
          : 'The admin request could not be completed.';
    return json({ ok: false, error: message }, 502);
  }
}
