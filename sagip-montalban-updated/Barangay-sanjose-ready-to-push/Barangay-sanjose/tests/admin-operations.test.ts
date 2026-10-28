import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_MAP_DISPLAY } from '../src/admin/types';
import { visibleHazards } from '../src/admin/visibility';
import type { ManagedHazard } from '../src/admin/types';
import type { HazardType } from '../src/types';

const now = new Date().toISOString();
const hazard = (id: string, overrides: Partial<ManagedHazard> = {}): ManagedHazard => ({
  id, type: 'flood' as HazardType, title: id, streetName: 'Street', sitio: 'Sitio',
  coordinates: [14.74, 121.13], timeReported: 'Now', status: 'active', severity: 'moderate',
  description: 'Description', reportedBy: 'Admin', visibility: 'published', source: 'admin',
  createdAt: now, updatedAt: now, ...overrides,
});

test('a new map display starts with every hazard layer enabled', () => {
  assert.deepEqual(DEFAULT_MAP_DISPLAY.types, {
    flood: true, fire: true, power: true, streetlight: true, water: true, road: true,
  });
  assert.equal(DEFAULT_MAP_DISPLAY.showResolved, true);
  assert.equal(DEFAULT_MAP_DISPLAY.showPagasa, true);
});

test('only published incidents reach the public map', () => {
  const data = {
    hazards: [
      hazard('published'),
      hazard('pending', { visibility: 'pending', source: 'community' }),
      hazard('hidden', { visibility: 'hidden' }),
    ],
    map: DEFAULT_MAP_DISPLAY,
  };
  assert.deepEqual(visibleHazards(data).map(item => item.id), ['published']);
});

test('a disabled hazard layer hides its pins without changing the record', () => {
  const hazards = [hazard('flood-1'), hazard('fire-1', { type: 'fire' })];
  const map = { ...DEFAULT_MAP_DISPLAY, types: { ...DEFAULT_MAP_DISPLAY.types, fire: false } };
  assert.deepEqual(visibleHazards({ hazards, map }).map(item => item.id), ['flood-1']);
  assert.equal(hazards[1].visibility, 'published');
});

test('the resolved layer switch controls cleared incidents only', () => {
  const hazards = [hazard('active'), hazard('resolved', { status: 'resolved' })];
  assert.equal(visibleHazards({ hazards, map: DEFAULT_MAP_DISPLAY }).length, 2);
  const hiding = { ...DEFAULT_MAP_DISPLAY, showResolved: false };
  assert.deepEqual(visibleHazards({ hazards, map: hiding }).map(item => item.id), ['active']);
});

// ---- Secret door + reporter timestamps ------------------------------------
import { isSecretQuery, unlockAdmin, lockAdmin, isAdminUnlocked, usingDefaultCredentials } from '../src/admin/gate';
import { relativeTime, exactTime } from '../src/admin/time';

const stubBrowser = () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
  };
  const target = globalThis as unknown as Record<string, unknown>;
  target.window = { dispatchEvent: () => true };
  target.sessionStorage = storage;
  target.localStorage = storage;
};

test('the secret word is the only search text that opens the gate', () => {
  stubBrowser();
  assert.equal(isSecretQuery('Admin'), true);
  assert.equal(isSecretQuery('  ADMIN  '), true);
  assert.equal(isSecretQuery('admin street'), false);
  assert.equal(isSecretQuery('flood'), false);
  assert.equal(isSecretQuery(''), false);
});

test('the default admin/admin pair unlocks and can be signed out again', () => {
  stubBrowser();
  assert.equal(usingDefaultCredentials(), true);
  assert.equal(isAdminUnlocked(), false);
  const wrong = unlockAdmin('admin', 'mali');
  assert.equal(wrong.ok, false);
  assert.match(String(wrong.message), /Mali/);
  assert.equal(isAdminUnlocked(), false);
  assert.equal(unlockAdmin('admin', 'admin').ok, true);
  assert.equal(isAdminUnlocked(), true);
  lockAdmin();
  assert.equal(isAdminUnlocked(), false);
});

test('reporter timestamps read as "x minuto / oras / araw ang nakalipas"', () => {
  const now = Date.parse('2026-10-29T12:00:00Z');
  assert.equal(relativeTime(new Date(now - 30_000).toISOString(), now), 'Ilang segundo lang ang nakalipas');
  assert.equal(relativeTime(new Date(now - 12 * 60_000).toISOString(), now), '12 minuto ang nakalipas');
  assert.equal(relativeTime(new Date(now - 5 * 3_600_000).toISOString(), now), '5 oras ang nakalipas');
  assert.equal(relativeTime(new Date(now - 3 * 86_400_000).toISOString(), now), '3 araw ang nakalipas');
  assert.equal(relativeTime('hindi-petsa', now), 'Walang timestamp');
  assert.equal(exactTime('hindi-petsa'), 'hindi-petsa');
  assert.match(exactTime(new Date(now).toISOString()), /2026/);
});
