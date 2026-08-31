import React, { useState, useRef } from 'react';
import { 
  X, 
  Flame, 
  Waves, 
  Zap, 
  LightbulbOff,
  Droplets, 
  AlertOctagon, 
  MapPin, 
  Crosshair,
  Send,
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { HazardAlert, HazardType, HazardSeverity } from '../types';
import { SAN_JOSE_SITIOS } from '../data/geoData';
import kasiglahanFloodImg from '../assets/images/kasiglahan_flood_rizal_1788211116468.jpg';
import litexFireImg from '../assets/images/litex_transformer_fire_1788211132714.jpg';
import sanJoseDownedPowerImg from '../assets/images/sanjose_downed_powerline_1788211148418.jpg';
import tagumpayStreetlightsImg from '../assets/images/tagumpay_dark_streetlights_1788211165673.jpg';
import eastwoodPipeLeakImg from '../assets/images/eastwood_pipe_leak_1788211180390.jpg';
import suburbanBridgeClearingImg from '../assets/images/suburban_bridge_clearing_1788211195809.jpg';

interface AddHazardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAlert: (newAlert: Omit<HazardAlert, 'id' | 'timeReported'>) => void;
  selectedCoordinates: [number, number] | null;
  onEnablePickCoordinateMode: () => void;
}

const COMMON_STREETS = [
  'Kasiglahan 1K1 Riverside Drive',
  'Kasiglahan Phase 1K Main Avenue',
  'J.P. Rizal Avenue (Poblacion San Jose)',
  'Litex Road / Manila Gravel Pit Access Rd',
  'Eastwood Boulevard (Phases 1-3)',
  'Amityville 4th Avenue',
  'Sub-Urban Main Entrance Bridge Rd',
  'Tagumpay Village Commercial Row',
  'Sitio Balite Bypass Road',
  'Metro Montana Valley St'
];

const PRESET_SAMPLE_PHOTOS: Record<HazardType, { label: string; url: string }> = {
  flood: {
    label: 'Kasiglahan 1K1 Riverside Flood Photo',
    url: kasiglahanFloodImg,
  },
  fire: {
    label: 'Litex Market Pole Transformer Fire Photo',
    url: litexFireImg,
  },
  power: {
    label: 'J.P. Rizal Snapped Cable / Downed Post Photo',
    url: sanJoseDownedPowerImg,
  },
  streetlight: {
    label: 'Tagumpay Village Dark Unlit Corridor Photo',
    url: tagumpayStreetlightsImg,
  },
  water: {
    label: 'Eastwood Blvd Manila Water Pipe Leak Photo',
    url: eastwoodPipeLeakImg,
  },
  road: {
    label: 'Sub-Urban Bridge Road Obstruction Photo',
    url: suburbanBridgeClearingImg,
  },
};

export const AddHazardModal: React.FC<AddHazardModalProps> = ({
  isOpen,
  onClose,
  onAddAlert,
  selectedCoordinates,
  onEnablePickCoordinateMode,
}) => {
  const [type, setType] = useState<HazardType>('flood');
  const [title, setTitle] = useState('');
  const [streetName, setStreetName] = useState(COMMON_STREETS[0]);
  const [sitio, setSitio] = useState(SAN_JOSE_SITIOS[0].name);
  const [severity, setSeverity] = useState<HazardSeverity>('high');
  const [description, setDescription] = useState('');
  const [reportedBy, setReportedBy] = useState('Barangay San Jose Resident');
  const [evacuationCenter, setEvacuationCenter] = useState('');
  
  // Photo verification state
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default coordinate if none selected
  const lat = selectedCoordinates ? selectedCoordinates[0] : 14.7430;
  const lng = selectedCoordinates ? selectedCoordinates[1] : 121.1330;

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('Image size should be less than 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setPhotoUrl(event.target.result);
        setPhotoError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUsePresetPhoto = () => {
    const preset = PRESET_SAMPLE_PHOTOS[type];
    if (preset) {
      setPhotoUrl(preset.url);
      setPhotoError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !streetName.trim()) return;

    // Strict Photo Requirement to prevent fake reports
    if (!photoUrl.trim()) {
      setPhotoError('Required: Kailangan mag-upload o maglagay ng litrato bilang proof upang ma-verify ang hazard pin.');
      return;
    }

    onAddAlert({
      type,
      title: title.trim(),
      streetName: streetName.trim(),
      sitio,
      coordinates: [lat, lng],
      status: 'active',
      severity,
      description: description.trim() || `${type.toUpperCase()} hazard reported along ${streetName}`,
      reportedBy: reportedBy.trim() || 'Citizen Report',
      photoUrl: photoUrl.trim(),
      evacuationCenter: evacuationCenter.trim() || undefined,
      updatesCount: 1,
      lastUpdated: 'Just now'
    });

    onClose();
    // Reset fields
    setTitle('');
    setDescription('');
    setPhotoUrl('');
    setPhotoError(null);
    setEvacuationCenter('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Pin Verified Hazard Incident</h2>
            <p className="text-[11px] text-slate-500 font-medium">Barangay San Jose, Rodriguez, Rizal</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Hazard Type Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Select Hazard Category:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('fire');
                  if (photoUrl && Object.values(PRESET_SAMPLE_PHOTOS).some(p => p.url === photoUrl)) {
                    setPhotoUrl(PRESET_SAMPLE_PHOTOS.fire.url);
                  }
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'fire'
                    ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Flame className="w-4 h-4 text-red-500" />
                <span>🔥 Fire Alert</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('flood');
                  if (photoUrl && Object.values(PRESET_SAMPLE_PHOTOS).some(p => p.url === photoUrl)) {
                    setPhotoUrl(PRESET_SAMPLE_PHOTOS.flood.url);
                  }
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'flood'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Waves className="w-4 h-4 text-blue-500" />
                <span>🌊 Flood Watch</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('power');
                  if (photoUrl && Object.values(PRESET_SAMPLE_PHOTOS).some(p => p.url === photoUrl)) {
                    setPhotoUrl(PRESET_SAMPLE_PHOTOS.power.url);
                  }
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'power'
                    ? 'bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>⚡ No Electricity</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('streetlight');
                  if (photoUrl && Object.values(PRESET_SAMPLE_PHOTOS).some(p => p.url === photoUrl)) {
                    setPhotoUrl(PRESET_SAMPLE_PHOTOS.streetlight.url);
                  }
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'streetlight'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <LightbulbOff className="w-4 h-4 text-indigo-600" />
                <span>💡 No Streetlights</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('water');
                  if (photoUrl && Object.values(PRESET_SAMPLE_PHOTOS).some(p => p.url === photoUrl)) {
                    setPhotoUrl(PRESET_SAMPLE_PHOTOS.water.url);
                  }
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'water'
                    ? 'bg-cyan-50 border-cyan-500 text-cyan-700 ring-1 ring-cyan-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Droplets className="w-4 h-4 text-cyan-500" />
                <span>🚰 Water Interr.</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('road');
                  if (photoUrl && Object.values(PRESET_SAMPLE_PHOTOS).some(p => p.url === photoUrl)) {
                    setPhotoUrl(PRESET_SAMPLE_PHOTOS.road.url);
                  }
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  type === 'road'
                    ? 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <AlertOctagon className="w-4 h-4 text-orange-500" />
                <span>🚧 Road Obstruction</span>
              </button>
            </div>
          </div>

          {/* Mandatory Photo Proof Section */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-rose-500" />
                <span>Kailangang Litrato / Photo Verification *</span>
              </label>
              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Anti-Fake Report Required
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-snug">
              Mag-upload ng aktwal na litrato mula sa lugar upang kumpirmahin ang totoong peligro sa Barangay San Jose.
            </p>

            {photoUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black h-36 flex items-center justify-center">
                <img src={photoUrl} alt="Uploaded Proof" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="bg-slate-900/80 hover:bg-slate-900 text-white text-xs px-2 py-1 rounded backdrop-blur-xs font-semibold cursor-pointer"
                  >
                    Palitan
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 bg-emerald-600/90 text-white text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Photo Proof Attached</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white rounded-lg p-4 text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-700">Click to upload camera photo or image file</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, JPEG up to 8MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleUsePresetPhoto}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    <span>Auto-attach Sample {type.toUpperCase()} Photo</span>
                  </button>
                </div>
              </div>
            )}

            {photoError && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{photoError}</span>
              </div>
            )}
          </div>

          {/* Incident Title */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Incident Headline / Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Waist-deep flood along river dike / Snapped electrical cable"
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          {/* Street & Sitio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Street / Specific Location *
              </label>
              <input
                type="text"
                required
                list="street-options"
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
                placeholder="Street name or landmark"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
              <datalist id="street-options">
                {COMMON_STREETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Sitio / Sector
              </label>
              <select
                value={sitio}
                onChange={(e) => setSitio(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
              >
                {SAN_JOSE_SITIOS.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Coordinates & Pin Picker */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Geographic Pin Coordinates (WGS84)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onEnablePickCoordinateMode();
                  onClose();
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 transition-colors cursor-pointer"
              >
                <Crosshair className="w-3 h-3 text-emerald-600" />
                <span>Click Pin On Map</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block font-sans">Latitude</span>
                <span className="font-semibold text-slate-800">{lat.toFixed(5)}° N</span>
              </div>
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block font-sans">Longitude</span>
                <span className="font-semibold text-slate-800">{lng.toFixed(5)}° E</span>
              </div>
            </div>
          </div>

          {/* Severity & Reporter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as HazardSeverity)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
              >
                <option value="critical">🔴 Critical (Immediate Threat)</option>
                <option value="high">🟠 High (Urgent Action)</option>
                <option value="moderate">🟡 Moderate (Advisory)</option>
                <option value="low">⚪ Low (Notice / Advisory)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Reported By
              </label>
              <input
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                placeholder="e.g. Kasiglahan Tanod / Resident"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Incident Description & Status Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide situational details, water depth, affected blocks, or emergency response instructions..."
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          {/* Evacuation Center (if applicable) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Designated Evacuation Facility (Optional)
            </label>
            <input
              type="text"
              value={evacuationCenter}
              onChange={(e) => setEvacuationCenter(e.target.value)}
              placeholder="e.g. Kasiglahan Village Elementary School Gym"
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Publish Verified Hazard Pin</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
