import React, { useState, useEffect } from 'react';
import { 
  ExternalLink, 
  Settings, 
  X, 
  Radio, 
  ShieldCheck,
  Maximize2
} from 'lucide-react';

interface WaterLevelLiveBannerProps {
  liveUrl: string;
  onOpenEditModal: () => void;
  onRemoveLive: () => void;
}

export const WaterLevelLiveBanner: React.FC<WaterLevelLiveBannerProps> = ({
  liveUrl,
  onOpenEditModal,
  onRemoveLive,
}) => {
  // STRICT RULE: IF NO LIVE URL IS PROVIDED, RENDER ABSOLUTELY NOTHING
  if (!liveUrl || liveUrl.trim() === '') {
    return null;
  }

  const [liveTimestamp, setLiveTimestamp] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTimestamp(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine embed source (Facebook, YouTube, or generic iframe)
  const getEmbedUrl = (url: string): { type: 'fb' | 'youtube' | 'iframe'; embedSrc: string } => {
    try {
      if (url.includes('facebook.com') || url.includes('fb.watch')) {
        return {
          type: 'fb',
          embedSrc: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
            url
          )}&show_text=false&width=560&t=0`,
        };
      }
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('v=')) {
          videoId = new URL(url).searchParams.get('v') || '';
        } else if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
        } else if (url.includes('live/')) {
          videoId = url.split('live/')[1]?.split('?')[0] || '';
        }
        return {
          type: 'youtube',
          embedSrc: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`,
        };
      }
    } catch {
      // fallback
    }
    return {
      type: 'iframe',
      embedSrc: url,
    };
  };

  const { embedSrc } = getEmbedUrl(liveUrl);

  return (
    <div className="bg-slate-900 border-b-2 border-red-600 shadow-md overflow-hidden shrink-0">
      {/* Official Broadcast Header Bar */}
      <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Real Live Indicator Badge */}
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white tracking-wider uppercase shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            LIVE
          </span>

          <div className="truncate">
            <h3 className="text-xs font-bold text-white tracking-tight leading-tight truncate">
              WATER LEVEL MONITORING
            </h3>
            <p className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
              <span>Bayan ng Montalban</span>
              <span>•</span>
              <span className="font-mono text-red-400">{liveTimestamp} PHT</span>
            </p>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenEditModal}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Palitan o i-edit ang link"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRemoveLive}
            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
            title="Alisin ang live broadcast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Embedded Real Video Player Frame */}
      <div className="relative bg-black aspect-video w-full overflow-hidden">
        <iframe
          src={embedSrc}
          className="w-full h-full border-0"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
          allowFullScreen={true}
          title="Bayan ng Montalban Live Water Level Monitoring"
        />
      </div>

      {/* Footer link to open on actual Facebook/Platform */}
      <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px]">Verified LGU Stream</span>
        </div>

        <a
          href={liveUrl}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
        >
          <span>Buksan sa Official Page</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
