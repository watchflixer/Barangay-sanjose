import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  BookOpen, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  Upload
} from 'lucide-react';
import { getSanJoseGeoJSON, SAN_JOSE_POLYGON_COORDS } from '../data/geoData';

interface GeoJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateBoundaryCoords?: (coords: [number, number][]) => void;
}

export const GeoJsonModal: React.FC<GeoJsonModalProps> = ({
  isOpen,
  onClose,
  onUpdateBoundaryCoords,
}) => {
  const [activeTab, setActiveTab] = useState<'geojson' | 'instructions' | 'css'>('geojson');
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const geoJsonData = getSanJoseGeoJSON();
  const formattedJson = JSON.stringify(geoJsonData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([formattedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'barangay-san-jose-rodriguez-boundary.geojson';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportGeoJson = () => {
    try {
      const parsed = JSON.parse(importText);
      let rawCoords: any[] = [];

      if (parsed.type === 'FeatureCollection' && parsed.features?.[0]?.geometry?.coordinates) {
        rawCoords = parsed.features[0].geometry.coordinates[0];
      } else if (parsed.type === 'Feature' && parsed.geometry?.coordinates) {
        rawCoords = parsed.geometry.coordinates[0];
      } else if (parsed.type === 'Polygon' && parsed.coordinates) {
        rawCoords = parsed.coordinates[0];
      } else if (Array.isArray(parsed)) {
        rawCoords = parsed;
      }

      if (rawCoords.length < 3) {
        throw new Error('Polygon must contain at least 3 coordinate points.');
      }

      // In GeoJSON coords are [lng, lat], convert to [lat, lng] for Leaflet
      const converted: [number, number][] = rawCoords.map((pt: any) => {
        if (Array.isArray(pt)) {
          // If first number is ~121 (lng) and second is ~14 (lat)
          if (pt[0] > 50) {
            return [pt[1], pt[0]];
          }
          return [pt[0], pt[1]];
        }
        return [14.7425, 121.1310];
      });

      if (onUpdateBoundaryCoords) {
        onUpdateBoundaryCoords(converted);
        setImportStatus('Boundary updated successfully!');
        setTimeout(() => setImportStatus(null), 3000);
      }
    } catch (err: any) {
      setImportStatus(`Error: ${err.message || 'Invalid GeoJSON format'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center text-white font-mono text-xs">
              <FileCode className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                GeoJSON Boundary & Clipping Guide
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Barangay San Jose, Rodriguez (Montalban), Rizal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('geojson')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'geojson'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>GeoJSON Source Code</span>
          </button>

          <button
            onClick={() => setActiveTab('instructions')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'instructions'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>GIS Masking Instructions</span>
          </button>

          <button
            onClick={() => setActiveTab('css')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'css'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Leaflet Masking CSS</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-xs">
          {activeTab === 'geojson' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  Official WGS84 GeoJSON FeatureCollection:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download .geojson</span>
                  </button>
                </div>
              </div>

              <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-emerald-300 leading-relaxed max-h-80 overflow-y-auto custom-scrollbar">
                <pre>{formattedJson}</pre>
              </div>

              {/* Upload Custom GeoJSON Box */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>Insert / Paste Updated GeoJSON Coordinates:</span>
                </span>
                <textarea
                  rows={2}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder='Paste custom GeoJSON Feature or Polygon coordinate array here...'
                  className="w-full p-2 text-[11px] font-mono border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                {importStatus && (
                  <p className="text-[11px] font-semibold text-emerald-700">
                    {importStatus}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleImportGeoJson}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors"
                >
                  Apply Custom Boundary
                </button>
              </div>
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <h3 className="font-bold text-emerald-950 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>How the Inverted Polygon Mask Works</span>
                </h3>
                <p className="text-emerald-900 text-xs leading-normal">
                  To achieve the effect where <strong>ONLY Barangay San Jose</strong> is visible and all surrounding territories (Burgos, Macabud, San Mateo, Quezon City, Payatas) are completely blacked out, we use the GIS <em>"Donut / Inverted Mask Polygon"</em> technique in Leaflet.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-xs">Step 1: Construct the World Outer Ring & Inner Hole</h4>
                  <p className="text-slate-600 text-xs">
                    Leaflet's <code>L.polygon([outerRing, innerHole])</code> accepts multiple coordinate rings. The first ring covers the entire globe <code>[[90, -180], [90, 180], [-90, 180], [-90, -180]]</code>, and the second ring is the polygon boundary of Barangay San Jose.
                  </p>
                  <div className="p-2.5 bg-slate-900 text-emerald-300 rounded font-mono text-[11px] overflow-x-auto">
{`const worldRing = [[90, -180], [90, 180], [-90, 180], [-90, -180], [90, -180]];
const sanJoseHole = SAN_JOSE_COORDS; // [lat, lng][]

// Inverted polygon paints world black EXCEPT San Jose!
L.polygon([worldRing, sanJoseHole], {
  fillColor: '#000000',
  fillOpacity: 0.98,
  stroke: false
}).addTo(map);`}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-xs">Step 2: Lock Camera strictly to San Jose Bounds</h4>
                  <p className="text-slate-600 text-xs">
                    Disable dragging beyond the boundary by setting <code>maxBounds</code> and <code>maxBoundsViscosity: 1.0</code>:
                  </p>
                  <div className="p-2.5 bg-slate-900 text-emerald-300 rounded font-mono text-[11px] overflow-x-auto">
{`const sanJoseBounds = L.latLngBounds([14.7120, 121.0950], [14.7760, 121.1660]);

const map = L.map('map-id', {
  center: [14.7425, 121.1310],
  zoom: 14,
  minZoom: 13,
  maxZoom: 18,
  maxBounds: sanJoseBounds,
  maxBoundsViscosity: 1.0 // Prevents dragging outside San Jose
});`}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-xs">Step 3: Render Custom Hazard DivIcons</h4>
                  <p className="text-slate-600 text-xs">
                    Custom Leaflet <code>L.divIcon</code> elements render the Fire (🔥), Flood (🌊), Power (💡), and Water (🚰) pins with animated pulse rings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'css' && (
            <div className="space-y-4">
              <span className="font-semibold text-slate-700">
                Standard CSS Classes for Blackout Mask & High-Contrast White UI:
              </span>
              <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-sky-300 leading-relaxed max-h-80 overflow-y-auto custom-scrollbar">
                <pre>{`/* Inverted Mask Blackout Layer */
.gis-blackout-mask {
  pointer-events: auto;
  transition: fill-opacity 0.25s ease;
}

/* Custom Hazard Pin Container with Pulse Ring */
.hazard-pin-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  transform: translate(-50%, -50%);
}

.hazard-pin-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.35);
  border: 2px solid #ffffff;
  z-index: 2;
}

.hazard-pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 12px;
  animation: hazard-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
  opacity: 0.65;
}`}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
