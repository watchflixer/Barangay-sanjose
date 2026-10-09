import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Connect, type Plugin} from 'vite';

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

export default defineConfig(() => {
  return {
    // Relative base so the built site works on GitHub Pages project paths
    // (https://<user>.github.io/<repo>/) as well as at a domain root.
    base: './',
    plugins: [pixel7OnDemand(), react(), tailwindcss()],
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
          // The AuraCast weather & radar app, embedded by the Weather view.
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
