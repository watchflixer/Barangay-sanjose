import React from 'react';
import { 
  X, 
  PhoneCall, 
  ShieldAlert, 
  Flame, 
  LifeBuoy, 
  Droplets, 
  Zap, 
  BadgeCheck, 
  Copy, 
  Check 
} from 'lucide-react';
import { EMERGENCY_CONTACTS } from '../data/geoData';

interface EmergencyHotlinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyHotlinesModal: React.FC<EmergencyHotlinesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedNum, setCopiedNum] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNum(num);
    setTimeout(() => setCopiedNum(null), 2000);
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'fire':
        return <Flame className="w-5 h-5 text-red-500" />;
      case 'rescue':
        return <LifeBuoy className="w-5 h-5 text-blue-500" />;
      case 'police':
        return <BadgeCheck className="w-5 h-5 text-indigo-500" />;
      case 'utility':
        return <Zap className="w-5 h-5 text-amber-500" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-emerald-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-rose-600 flex items-center justify-center text-white shadow-xs">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Emergency & Disaster Hotlines</h2>
              <p className="text-[11px] text-slate-500 font-medium">Barangay San Jose & Rodriguez (Montalban), Rizal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Directory List */}
        <div className="p-5 overflow-y-auto space-y-3 custom-scrollbar text-xs">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-red-600 block">National Emergency Hotline</span>
              <span className="text-lg font-extrabold text-red-700">911</span>
            </div>
            <a
              href="tel:911"
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md shadow-xs transition-colors flex items-center gap-1 text-xs"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call 911</span>
            </a>
          </div>

          {EMERGENCY_CONTACTS.map((contact, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50 hover:bg-white rounded-lg border border-slate-200 transition-all space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {getContactIcon(contact.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">{contact.label}</h3>
                    <p className="text-[11px] text-slate-500">{contact.agency}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {contact.numbers.map((num, nIdx) => (
                  <div
                    key={nIdx}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-mono text-slate-800"
                  >
                    <span>{num}</span>
                    <button
                      onClick={() => handleCopyNumber(num)}
                      title="Copy Number"
                      className="text-slate-400 hover:text-slate-700"
                    >
                      {copiedNum === num ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <a
                      href={`tel:${num.replace(/[^0-9]/g, '')}`}
                      className="text-emerald-600 hover:text-emerald-700 font-bold ml-1 font-sans text-[10px]"
                    >
                      Call
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};
