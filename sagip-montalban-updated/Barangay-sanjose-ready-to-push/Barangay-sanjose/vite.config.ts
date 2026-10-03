import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Connect, type Plugin} from 'vite';

/**
 * PIXEL 7 BY DEFAULT
 * ------------------
 * Every time this app is served (`npm run preview` or `npm run dev`) a plain
 * visit to "/" lands straight on the Pixel 7 device preview
 * (public/pixel7-preview.html) instead of the desktop layout.
 *
 * How to reach the real (desktop) app:
 *   - "/?full=1"  or  "/?desktop=1"   -> normal desktop app at the root URL
 *   - "/index.html"                   -> normal desktop app (used by the
 *                                        device-frame iframes themselves)
 *   - deep links like "/?traffic=1&sfrom=..." always go to the app, so the
 *     in-app "Share" links keep working.
 */
const DESKTOP_FLAGS = ['full', 'desktop'];

function pixel7ByDefault(): Plugin {
  const pixel7First: Connect.NextHandleFunction = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    const [pathname, search = ''] = (req.url || '/').split('?');

    // Only the bare root is redirected. "/index.html" stays the real app so
    // the Pixel 7 frame (and the All Devices page) can embed it safely.
    if (pathname !== '/') return next();

    const params = new URLSearchParams(search);
    const keys = [...params.keys()];
    const wantsDesktop = keys.some((key) => DESKTOP_FLAGS.includes(key));
    const isDeepLink = keys.some((key) => !DESKTOP_FLAGS.includes(key));

    // Desktop was asked for explicitly, or this is an app deep link.
    if (wantsDesktop || isDeepLink) return next();

    res.statusCode = 302;
    res.setHeader('Location', '/pixel7-preview.html');
    res.setHeader('Cache-Control', 'no-store');
    res.end();
  };

  return {
    name: 'pixel7-by-default',
    configureServer(server) {
      server.middlewares.use(pixel7First);
    },
    configurePreviewServer(server) {
      server.middlewares.use(pixel7First);
    },
  };
}

export default defineConfig(() => {
  return {
    // Relative base so the built site works on GitHub Pages project paths
    // (https://<user>.github.io/<repo>/) as well as at a domain root.
    base: './',
    plugins: [pixel7ByDefault(), react(), tailwindcss()],
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
    preview: {
      port: 4173,
      host: '0.0.0.0',
      allowedHosts: true as const,
    },
  };
});
