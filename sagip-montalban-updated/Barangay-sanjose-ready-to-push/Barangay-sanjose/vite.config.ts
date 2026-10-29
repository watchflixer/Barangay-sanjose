import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {pathToFileURL} from 'url';
import {defineConfig, loadEnv, type Connect, type Plugin} from 'vite';

/**
 * PIXEL 7 ON DEMAND
 * -----------------
 * "/" serves the real app on `npm run preview` and `npm run dev`. The Pixel 7
 * device frame (public/pixel7-preview.html) is opt-in:
 *
 *   - "/?pixel7=1"                   -> 302 to the Pixel 7 device preview
 *   - "/pixel7-preview.html"         -> the frame directly (sizes it embeds
 *                                       "/index.html", which stays the real app)
 *   - "/mobile-preview.html"         -> all devices page
 *   - "/?full=1" or "/?desktop=1"    -> normal desktop app (kept for old links)
 *   - deep links like "/?traffic=1&sfrom=..." go straight to the app, so the
 *     in-app "Share" links keep working.
 */
const PIXEL7_FLAG = 'pixel7';

/**
 * ADMIN FUNCTIONS IN DEV
 * ----------------------
 * In production, Cloudflare Pages runs `functions/api/admin/*` and the admin
 * credential lives only in the Pages environment. `vite dev` has no Functions,
 * so this middleware mounts the very same modules on the dev server. That keeps
 * one implementation and lets the secure flow be tested before deploying.
 *
 * Without ADMIN_EMAIL / ADMIN_PASSWORD / SESSION_SECRET in the environment the
 * handlers answer "not configured", the client detects it, and the app falls
 * back to direct sign-in for local work.
 */
function adminFunctions(): Plugin {
  const routes: Record<string, {file: string; method: 'GET' | 'POST'}> = {
    '/api/admin/session': {file: 'functions/api/admin/session.js', method: 'GET'},
    '/api/admin/login': {file: 'functions/api/admin/login.js', method: 'POST'},
    '/api/admin/logout': {file: 'functions/api/admin/logout.js', method: 'POST'},
    '/api/admin/rpc': {file: 'functions/api/admin/rpc.js', method: 'POST'},
  };

  return {
    name: 'admin-functions',
    configureServer(server) {
      // Same classification Pages runs at the edge, so bot rules can be tested
      // locally instead of only after a deploy.
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url || '/').split('?')[0];
        const shielded = ['/api/admin/login', '/api/admin/session', '/api/admin/logout', '/api/admin/rpc']
          .some((prefix) => pathname.startsWith(prefix));
        if (shielded) return next();
        try {
          const shield = await import(pathToFileURL(path.resolve(__dirname, 'functions/_middleware.js')).href);
          if (process.env.SHIELD_DISABLED === '1') return next();
          const kind = shield.classifyAgent(req.headers['user-agent'] || '', {
            allowHttpClients: process.env.SHIELD_ALLOW_HTTP_CLIENTS === '1',
          });
          if (kind === 'bot' || kind === 'scanner') {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, noai, noimageai');
            res.end(JSON.stringify({error: 'Automated collection is not permitted on this site.'}));
            return;
          }
          res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'SAMEORIGIN');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          res.setHeader(
            'Permissions-Policy',
            'geolocation=(self), camera=(), microphone=(), payment=()',
          );
        } catch (error) {
          server.config.logger.error(`[edge-shield] ${(error as Error).message}`);
        }
        next();
      });

      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url || '/').split('?')[0];
        const route = routes[pathname];
        if (!route) return next();

        const env = {
          ADMIN_EMAIL: process.env.ADMIN_EMAIL,
          ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
          SESSION_SECRET: process.env.SESSION_SECRET,
          ADMIN_SUPABASE_URL: process.env.ADMIN_SUPABASE_URL,
          ADMIN_SUPABASE_ANON_KEY: process.env.ADMIN_SUPABASE_ANON_KEY,
        };

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(Buffer.from(chunk as Buffer));
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: route.method === 'GET' || !body || body.length === 0 ? undefined : body,
          });
          const handlerName = route.method === 'GET' ? 'onRequestGet' : 'onRequestPost';
          const module = await import(pathToFileURL(path.resolve(__dirname, route.file)).href);
          const handler = module[handlerName];
          if (typeof handler !== 'function') return next();
          const response: Response = await handler({request, env});
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') return;
            res.setHeader(key, value);
          });
          const cookie = response.headers.get('Set-Cookie');
          if (cookie) res.setHeader('Set-Cookie', cookie);
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ok: false, error: 'Admin function failed in dev.'}));
          server.config.logger.error(`[admin-functions] ${(error as Error).message}`);
        }
      });
    },
  };
}

function pixel7OnDemand(): Plugin {
  const pixel7First: Connect.NextHandleFunction = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    const [pathname, search = ''] = (req.url || '/').split('?');

    // Only the bare root can be redirected. "/index.html" stays the real app
    // so the Pixel 7 frame (and the All Devices page) can embed it safely.
    if (pathname !== '/') return next();

    const params = new URLSearchParams(search);
    const keys = [...params.keys()];

    // Opt-in only — everything else is the app.
    if (!keys.includes(PIXEL7_FLAG)) return next();

    res.statusCode = 302;
    res.setHeader('Location', '/pixel7-preview.html');
    res.setHeader('Cache-Control', 'no-store');
    res.end();
  };

  return {
    name: 'pixel7-on-demand',
    configureServer(server) {
      server.middlewares.use(pixel7First);
    },
    configurePreviewServer(server) {
      server.middlewares.use(pixel7First);
    },
  };
}

export default defineConfig(({mode}) => {
  // Non-VITE_ vars are read from .env.local for the dev Functions only; they are
  // never exposed to the client bundle.
  const env = loadEnv(mode, __dirname, '');
  for (const key of ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'SESSION_SECRET', 'ADMIN_SUPABASE_URL', 'ADMIN_SUPABASE_ANON_KEY']) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }
  return {
    // Relative base so the built site works on GitHub Pages project paths
    // (https://<user>.github.io/<repo>/) as well as at a domain root.
    base: './',
    plugins: [pixel7OnDemand(), adminFunctions(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          // The complete Panahon project from the Drive folder, embedded by the Weather view.
          weather: path.resolve(__dirname, 'weather.html'),
        },
      },
    },
    preview: {
      port: 4173,
      host: '0.0.0.0',
      allowedHosts: true as const,
    },
  };
});
