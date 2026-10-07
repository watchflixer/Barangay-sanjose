/**
 * Start every preview surface at once and keep them alive.
 *
 *   :4173  the real app            (vite preview)
 *   :4174  ALL DEVICES at the root (Pixel 7, iPhone SE, iPhone 14 Pro, Android)
 *   :4175  Pixel 7 + Desktop side by side at the root
 *
 * If any of them exits for any reason it is restarted automatically, with a
 * short backoff so a genuinely broken server can't spin in a tight loop.
 * Ctrl-C (or SIGTERM) shuts all of them down together.
 *
 * Run:  npm run preview:all
 *
 * Note: this keeps the servers up for as long as THIS process lives. It
 * cannot survive the machine/sandbox itself being recycled — for a URL that
 * is always up, deploy to GitHub Pages (.github/workflows/deploy.yml).
 */
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '..');
const DIST = path.join(APP, 'dist');
const SERVER = path.join(HERE, 'static-preview-server.mjs');

const viteBin = path.join(APP, 'node_modules', '.bin', 'vite');

if (!existsSync(DIST)) {
  console.error('✗ dist/ is missing — run `npm run build` first.');
  process.exit(1);
}
if (!existsSync(viteBin)) {
  console.error('✗ node_modules is missing — run `npm install` first.');
  process.exit(1);
}

const TARGETS = [
  {
    name: 'app',
    label: 'the app',
    port: 4173,
    cmd: viteBin,
    args: ['preview', '--host', '0.0.0.0', '--port', '4173'],
  },
  {
    name: 'devices',
    label: 'ALL DEVICES (Pixel 7 · iPhone SE · iPhone 14 Pro · Android)',
    port: 4174,
    cmd: process.execPath,
    args: [SERVER, DIST, '4174', 'mobile-preview.html'],
  },
  {
    name: 'compare',
    label: 'Pixel 7 + Desktop side by side',
    port: 4175,
    cmd: process.execPath,
    args: [SERVER, DIST, '4175', 'compare.html'],
  },
];

const PAD = Math.max(...TARGETS.map(t => t.name.length));
let shuttingDown = false;
const children = new Map();

function log(name, line) {
  if (line.trim()) console.log(`[${name.padEnd(PAD)}] ${line}`);
}

function start(target, attempt = 0) {
  if (shuttingDown) return;

  const child = spawn(target.cmd, target.args, {cwd: APP, stdio: ['ignore', 'pipe', 'pipe']});
  children.set(target.name, child);

  const onData = buf => String(buf).split('\n').forEach(l => log(target.name, l));
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);

  child.on('exit', (code, signal) => {
    children.delete(target.name);
    if (shuttingDown) return;

    // Backoff: 0.5s, 1s, 2s, 4s, capped at 5s.
    const delay = Math.min(500 * 2 ** attempt, 5000);
    log(target.name, `✗ exited (${signal || `code ${code}`}) — restarting in ${delay}ms`);
    setTimeout(() => start(target, attempt + 1), delay);
  });

  child.on('error', err => log(target.name, `✗ spawn failed: ${err.message}`));

  // Treat a server that stayed up for 10s as healthy and reset the backoff.
  setTimeout(() => {
    if (children.get(target.name) === child) attempt = 0;
  }, 10_000);
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nShutting down (${signal})…`);
  for (const child of children.values()) child.kill('SIGTERM');
  setTimeout(() => {
    for (const child of children.values()) child.kill('SIGKILL');
    process.exit(0);
  }, 3000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log('Starting previews — auto-restart is ON\n');
for (const t of TARGETS) {
  console.log(`  ➜  :${t.port}  ${t.label}`);
}
console.log('');
TARGETS.forEach(t => start(t));
