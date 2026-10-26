import React from 'react';

export type LocationPermissionState = 'idle' | 'load' | 'ok' | 'err' | 'no';

export interface LocationPermissionResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  sample?: boolean;
}

interface LocationPermissionCardProps {
  state: LocationPermissionState;
  errorMessage?: string;
  result?: LocationPermissionResult | null;
  onAllow: () => void;
  onDeny: () => void;
  onUseSample: () => void;
}

const copy = {
  idle: {
    title: 'Allow access to your location?',
    description: 'Get alerts, maps, and barangay services based on where you are.',
    action: 'Allow',
  },
  load: {
    title: 'Finding you…',
    description: 'Please allow location access if prompted.',
    action: 'Searching…',
  },
  ok: {
    title: 'Location found',
    description: '',
    action: 'Refresh',
  },
  err: {
    title: 'Can’t get your location',
    description: '',
    action: 'Try again',
  },
  no: {
    title: 'Location not shared',
    description: 'We won’t use your location. You can still view all incidents in the barangay.',
    action: 'Allow instead',
  },
} satisfies Record<LocationPermissionState, { title: string; description: string; action: string }>;

const formatCoordinate = (value: number, positive: string, negative: string) =>
  `${Math.abs(value).toFixed(5)}° ${value < 0 ? negative : positive}`;

export const LocationPermissionCard: React.FC<LocationPermissionCardProps> = ({
  state,
  errorMessage = 'Couldn’t get your location. Please try again.',
  result,
  onAllow,
  onDeny,
  onUseSample,
}) => {
  const message = state === 'ok'
    ? result?.sample
      ? 'This is sample data, not your real location.'
      : 'This is your current position.'
    : state === 'err'
      ? errorMessage
      : copy[state].description;

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-transparent p-4">
      <section
        className="w-full max-w-[300px] rounded-[24px] border border-[#dadce0] bg-white px-[18px] pb-3.5 pt-5 text-center text-[#202124] shadow-[0_1px_2px_rgba(60,64,67,.2),0_2px_6px_2px_rgba(60,64,67,.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-permission-title"
        aria-describedby="location-permission-description"
        data-s={state}
      >
        <div className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full transition-colors ${
          state === 'ok' ? 'bg-[#e6f4ea] text-[#188038]' :
          state === 'err' ? 'bg-[#fce8e6] text-[#d93025]' :
          state === 'no' ? 'bg-[#f1f3f4] text-[#5f6368]' :
          'bg-[#e8f0fe] text-[#1a73e8]'
        }`}>
          <svg className={`h-6 w-6 ${state === 'load' ? 'animate-pulse' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06ZM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
          </svg>
        </div>

        <h2 id="location-permission-title" className="m-0 text-[17px] font-medium leading-[1.3] tracking-[-.01em]">
          {state === 'load' ? copy.load.title : copy[state].title}
        </h2>
        <p id="location-permission-description" className="mx-auto mt-1 max-w-[250px] text-[13px] leading-[1.5] text-[#5f6368]">
          {message}
        </p>

        {state === 'ok' && result && (
          <div className="mt-3.5 overflow-hidden rounded-xl border border-[#dadce0] text-left">
            <div className="flex items-center justify-between px-3.5 py-[9px] text-[13px]">
              <span className="text-[#5f6368]">Latitude</span>
              <b className="font-medium tabular-nums">{formatCoordinate(result.latitude, 'N', 'S')}</b>
            </div>
            <div className="flex items-center justify-between border-t border-[#dadce0] px-3.5 py-[9px] text-[13px]">
              <span className="text-[#5f6368]">Longitude</span>
              <b className="font-medium tabular-nums">{formatCoordinate(result.longitude, 'E', 'W')}</b>
            </div>
            <div className="flex items-center justify-between border-t border-[#dadce0] px-3.5 py-[9px] text-[13px]">
              <span className="text-[#5f6368]">Accuracy</span>
              <b className="font-medium tabular-nums">± {Math.round(result.accuracy)} m</b>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-row gap-2">
          <button
            type="button"
            onClick={onAllow}
            disabled={state === 'load'}
            className="h-[38px] flex-1 rounded-full bg-[#1a73e8] px-3 text-[14px] font-medium text-white transition-[background,box-shadow] hover:bg-[#1765cc] hover:shadow-[0_1px_3px_rgba(26,115,232,.45)] disabled:cursor-default disabled:bg-[#dadce0] disabled:text-[#80868b] disabled:shadow-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#a8c7fa] focus-visible:outline-offset-2"
          >
            {state === 'load' ? copy.load.action : copy[state].action}
          </button>
          {state === 'idle' && (
            <button
              type="button"
              onClick={onDeny}
              className="h-[38px] flex-1 rounded-full border border-[#dadce0] bg-white px-3 text-[14px] font-medium text-[#1a73e8] transition-colors hover:bg-[#e8f0fe] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#a8c7fa] focus-visible:outline-offset-2"
            >
              Don’t allow
            </button>
          )}
          {state === 'err' && (
            <button
              type="button"
              onClick={onUseSample}
              className="h-[38px] flex-1 rounded-full border border-[#dadce0] bg-white px-3 text-[12px] font-medium text-[#1a73e8] transition-colors hover:bg-[#e8f0fe] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#a8c7fa] focus-visible:outline-offset-2"
            >
              Use sample location
            </button>
          )}
        </div>

        <div className="mt-3 text-[11px] text-[#80868b]">Your location is never saved.</div>
      </section>
    </div>
  );
};
