const GIBS_HIMAWARI_IR_LAYER = 'Himawari_AHI_Band13_Clean_Infrared';
const GIBS_HIMAWARI_TILE_MATRIX_SET = 'GoogleMapsCompatible_Level6';
export const HIMAWARI_MAX_NATIVE_ZOOM = 6;

/**
 * GIBS publishes Himawari clean-infrared scenes every ten minutes. Stay twenty
 * minutes behind wall-clock time to avoid requesting a scan before processing
 * has finished, then snap to the most recent ten-minute observation.
 */
export function getLatestHimawariTime(now = new Date()): string {
  const observationTime = new Date(now.getTime() - 20 * 60 * 1000);
  observationTime.setUTCMinutes(
    Math.floor(observationTime.getUTCMinutes() / 10) * 10,
    0,
    0
  );
  return observationTime.toISOString().replace(/\.000Z$/, 'Z');
}

/** Build a Leaflet-compatible Web Mercator URL for NASA GIBS Himawari IR. */
export function getHimawariInfraredTileUrl(time = getLatestHimawariTime()): string {
  return (
    'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/' +
    `${GIBS_HIMAWARI_IR_LAYER}/default/${time}/` +
    `${GIBS_HIMAWARI_TILE_MATRIX_SET}/{z}/{y}/{x}.png`
  );
}
