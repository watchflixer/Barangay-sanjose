import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Send, X } from 'lucide-react';
import type { HazardAlert } from '../types';

interface Props {
  alert: HazardAlert | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (note: string) => void;
}

/** Residents can ask for an incident to be closed; an admin still decides. */
export function ResolveRequestDialog({ alert, saving, error, onClose, onSubmit }: Props) {
  const [note, setNote] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const previous = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!alert) return;
    previous.current = document.activeElement as HTMLElement | null;
    setNote('');
    const timer = window.setTimeout(() => textarea.current?.focus(), 30);
    return () => {
      window.clearTimeout(timer);
      previous.current?.focus();
    };
  }, [alert]);

  if (!alert) return null;

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-xs sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-request-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !saving) onClose();
          if (event.key === 'Tab') {
            const nodes = Array.from(
              dialog.current?.querySelectorAll<HTMLElement>('input, textarea, button') || [],
            ).filter((node) => !node.hasAttribute('disabled'));
            if (!nodes.length) return;
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close resolve request"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 id="resolve-request-title" className="mt-4 text-lg font-semibold text-slate-900">
          Ask to mark this incident resolved?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          This sends a request to the barangay admin for review. The incident stays on the map until an admin
          accepts it.
        </p>
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
          {alert.title}
        </p>
        <label className="mt-4 block text-xs font-medium text-slate-600">
          What did you see? (optional)
          <textarea
            ref={textarea}
            rows={3}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. The road is already clear and passable."
            className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(note)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {saving ? 'Sending…' : 'Send resolve request'}
          </button>
        </div>
      </div>
    </div>
  );
}
