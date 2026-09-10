import React, { useState } from 'react';
import { Radio, X, Link2, ExternalLink, CheckCircle2, Trash2 } from 'lucide-react';

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLiveUrl: string;
  onSaveLiveUrl: (url: string) => void;
}

export const LiveStreamModal: React.FC<LiveStreamModalProps> = ({
  isOpen,
  onClose,
  currentLiveUrl,
  onSaveLiveUrl,
}) => {
  const [urlInput, setUrlInput] = useState(currentLiveUrl);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      onSaveLiveUrl('');
      onClose();
      return;
    }

    try {
      new URL(trimmed);
      setError(null);
      onSaveLiveUrl(trimmed);
      onClose();
    } catch {
      setError('Pakilagay ang wastong URL (hal. https://www.facebook.com/... o https://youtube.com/...)');
    }
  };

  const handleRemove = () => {
    setUrlInput('');
    onSaveLiveUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">I-link ang Facebook Live Stream</h2>
              <p className="text-[11px] text-slate-300">LIVE | Water Level Monitoring ng Bayan ng Montalban</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Facebook Live o Video URL</span>
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="https://www.facebook.com/BayanNgMontalbanOfficial/videos/..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-slate-800 bg-slate-50"
              autoFocus
            />
            {error && (
              <p className="text-[11px] text-red-600 font-medium">{error}</p>
            )}
            <p className="text-[11px] text-slate-500 leading-relaxed">
              I-paste dito ang direktang link ng live broadcast ng <strong>Bayan ng Montalban</strong> o MDRRMO. Kapag may link, awtomatikong lalabas ang official video player sa itaas ng incident status.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Paano kumuha ng link sa Facebook:</span>
            </div>
            <p className="text-[11px] text-slate-500">
              1. Buksan ang post ng Live sa Facebook.<br />
              2. I-click ang <strong>Share</strong> o <strong>Copy Link</strong>.<br />
              3. I-paste ang link sa box sa itaas at i-click ang <strong>I-save at I-embed</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {currentLiveUrl ? (
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Tanggalin ang Live</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Kanselahin
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>I-save at I-embed</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
