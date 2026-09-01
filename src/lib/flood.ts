export interface FloodStation {
  name: string;
  landmark?: string;
  river?: string;
  currentLevel: string | number | null;
  alertLevel?: string | number | null;
  alarmLevel?: string | number | null;
  criticalLevel?: string | number | null;
  unit?: string;
}

export interface FloodStatusData {
  fetchedAt: string;
  barangay: string;
  stations: FloodStation[];
}

export type FloodLevel = 'normal' | 'watch' | 'alarm' | 'critical' | 'unknown';

export function classifyFloodLevel(station: FloodStation): FloodLevel {
  const cur = parseFloat(String(station.currentLevel));
  const alert = parseFloat(String(station.alertLevel));
  const alarm = parseFloat(String(station.alarmLevel));
  const critical = parseFloat(String(station.criticalLevel));
  if (isNaN(cur)) return 'unknown';
  if (!isNaN(critical) && cur >= critical) return 'critical';
  if (!isNaN(alarm) && cur >= alarm) return 'alarm';
  if (!isNaN(alert) && cur >= alert) return 'watch';
  return 'normal';
}

export const FLOOD_DATA_URL = `${import.meta.env.BASE_URL}data/flood-status.json`;

// Approximate coordinates for San Jose Bridge (Rodriguez Highway crossing of the
// Marikina River at Barangay San Jose, Rodriguez, Rizal) — the landmark PAGASA's
// "Rodriguez" gauge station corresponds to.
export const SAN_JOSE_BRIDGE_COORDS: [number, number] = [14.745, 121.14];

export const AUTO_FLOOD_ALERT_ID = 'auto-pagasa-san-jose-bridge';
