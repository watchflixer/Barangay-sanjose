import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { HazardAlert, HazardDraft, HazardType, HazardSeverity } from '../types';
import { reportDraftError } from '../lib/reportsApi';
import { INITIAL_HAZARDS, SAN_JOSE_SITIOS } from '../data/geoData';

interface AddHazardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAlert: (newAlert: Omit<HazardAlert, 'id' | 'timeReported'>) => Promise<void> | void;
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
  'Metro Montana Valley St',
];

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
  const [reportedBy, setReportedBy] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');

  // Photo evidence state
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedCoordinates) return;

    const [latitude, longitude] = selectedCoordinates;
    const distanceTo = (coordinates: [number, number]) =>
      Math.hypot(latitude - coordinates[0], longitude - coordinates[1]);

    const nearestSitio = SAN_JOSE_SITIOS.reduce((nearest, sitio) =>
      distanceTo(sitio.coordinates) < distanceTo(nearest.coordinates) ? sitio : nearest,
    );
    const nearestKnownLocation = INITIAL_HAZARDS.reduce((nearest, alert) =>
      distanceTo(alert.coordinates) < distanceTo(nearest.coordinates) ? alert : nearest,
    );

    setSitio(nearestSitio.name);
    setStreetName(nearestKnownLocation.streetName);
  }, [selectedCoordinates]);

  // Default coordinate if none selected
  const lat = selectedCoordinates ? selectedCoordinates[0] : 14.743;
  const lng = selectedCoordinates ? selectedCoordinates[1] : 121.133;

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setPhotoError('Image size should be less than 15MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawData = event.target?.result;
      if (typeof rawData === 'string') {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 960;
            let width = img.width;
            let height = img.height;
            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedData = canvas.toDataURL('image/jpeg', 0.72);
              setPhotoUrl(compressedData);
              setPhotoError(null);
            } else {
              setPhotoUrl(rawData);
              setPhotoError(null);
            }
          } catch {
            setPhotoUrl(rawData);
            setPhotoError(null);
          }
        };
        img.onerror = () => {
          setPhotoUrl(rawData);
          setPhotoError(null);
        };
        img.src = rawData;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError('');
    setPhotoError(null);

    const draft: HazardDraft = {
      type,
      title: title.trim(),
      streetName: streetName.trim(),
      sitio,
      coordinates: [lat, lng],
      status: 'active',
      severity,
      description:
        description.trim() ||
        `${type.toUpperCase()} hazard reported along ${streetName.trim() || 'the barangay'}`,
      reportedBy: reportedBy.trim(),
      contactNumber: contactNumber.trim(),
      reporterEmail: reporterEmail.trim().toLowerCase(),
      photoUrl: photoUrl.trim(),
      affectedHouseholds: undefined,
      evacuationCenter: undefined,
    };

    // A photo is non-negotiable: an admin reviews every report before publishing.
    if (!draft.photoUrl) {
      setPhotoError(
        'Required: upload or add a photo so an admin can review this report before it is published.',
      );
      return;
    }
    const problem = reportDraftError(draft, true);
    if (problem) {
      setSubmitError(problem);
      return;
    }

    setSubmitting(true);
    try {
      await onAddAlert(draft);
      onClose();
      setTitle('');
      setDescription('');
      setPhotoUrl('');
      setPhotoError(null);
      setReportedBy('');
      setContactNumber('');
      setReporterEmail('');
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Could not submit the report. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Submit a hazard report
            </h2>
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
                <span>Photo evidence required *</span>
              </label>
              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Checked on review
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-snug">
              Upload an actual photo from the site so an admin can check the hazard before publishing it on
              the public map.
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
                  <p className="text-xs font-bold text-slate-700">
                    Click to upload camera photo or image file
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, JPEG up to 8MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="pt-1 text-[11px] font-semibold text-rose-600">*Required</div>
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
          <div className="grid grid-cols-1 gap-3">
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
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block font-sans">
                  Latitude
                </span>
                <span className="font-semibold text-slate-800">{lat.toFixed(5)}° N</span>
              </div>
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block font-sans">
                  Longitude
                </span>
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
                Full name *
              </label>
              <input
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                required
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Cellphone number *
              </label>
              <input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="e.g. 09171234567"
                required
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Google account (Gmail) *
              </label>
              <input
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder="e.g. juan@gmail.com"
                required
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>
          </div>

          <p className="rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
            Your report is sent to the barangay admin for review before it appears on the map. Your full name
            is hidden by default and an admin may choose to show it; your Google account and cellphone number
            are only used to verify the report and are never shown publicly.
          </p>
          {submitError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-[11px] font-medium text-red-700">
              {submitError}
            </p>
          )}
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
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-all cursor-pointer disabled:cursor-wait disabled:opacity-70"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>{submitting ? 'Submitting…' : 'Submit hazard report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
