import React, { useEffect, useRef } from 'react';
import { X, Map as MapIcon, Layers, Megaphone, PhoneCall, Smartphone } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <MapIcon className="h-4 w-4" />,
    title: 'Read the incident map',
    body: 'Pins show verified incident reports in Barangay San Jose. Tap a pin or a card in the feed to see the details.',
  },
  {
    icon: <Layers className="h-4 w-4" />,
    title: 'Switch the map view',
    body: 'Use the layers button on the map to open Traffic, Flood Prone, Weather or Help Center views. Choose Streets to return to the incident map.',
  },
  {
    icon: <Megaphone className="h-4 w-4" />,
    title: 'Report a hazard',
    body: 'Select Report a hazard, pick the location on the map, and describe what you see. Barangay admins review every report before it is published.',
  },
  {
    icon: <PhoneCall className="h-4 w-4" />,
    title: 'Call for help',
    body: 'For an emergency, open Hotlines for the barangay, fire, rescue and police numbers. Call 911 when a life is at risk.',
  },
  {
    icon: <Smartphone className="h-4 w-4" />,
    title: 'Add to your home screen',
    body: 'On Android (Chrome) open the menu and choose "Add to Home screen". On iPhone (Safari) tap Share, then "Add to Home Screen".',
  },
];

/**
 * A plain, read-only guide. It is opened from the Guide button and the
 * "Get app" shortcut, and closes with its X, the backdrop or Escape.
 */
export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1800] flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="guide-modal-title" className="text-base font-semibold text-slate-900">
              How to use HazardSync
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Barangay San Jose hazard monitoring</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ol className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                {step.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  <span className="mr-1 text-slate-400">{index + 1}.</span>
                  {step.title}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
