import React, { useEffect, useRef, useState } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import type { HazardAlert, HazardDraft } from '../types';
import type { AdminChange, ReportAction } from '../lib/admin';

interface Props {
  isOpen: boolean;
  authenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onClose: () => void;
  alerts: HazardAlert[];
  history: ReportAction[];
  onChange: (id: string, change: AdminChange) => void;
  storageError: string;
  onCreate: (draft: HazardDraft) => HazardAlert | undefined;
}

export function AdminPortal({
  isOpen,
  authenticated,
  onLogin,
  onLogout,
  onClose,
  alerts,
  history,
  onChange,
  storageError,
  onCreate,
}: Props) {
  const [, tick] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    (
      dialog.current?.querySelector<HTMLElement>('input') ||
      dialog.current?.querySelector<HTMLElement>('button')
    )?.focus();
    const timer = window.setInterval(() => tick((value) => value + 1), 60000);
    return () => {
      clearInterval(timer);
      previous?.focus();
    };
  }, [isOpen, authenticated]);
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[2000] flex items-center justify-center ${authenticated ? 'sj-admin-overlay' : 'sj-login-overlay'}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
          if (event.key === 'Tab') {
            const scope =
              dialog.current?.querySelector<HTMLElement>('[role="alertdialog"]') || dialog.current;
            const nodes = Array.from(
              scope?.querySelectorAll<HTMLElement>('input, textarea, button, select, [tabindex="0"]') || [],
            ).filter((node) => node.getClientRects().length > 0 && !node.hasAttribute('disabled'));
            if (!nodes.length) return;
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
        className={authenticated ? 'sj-admin-dialog' : 'sj-login-dialog'}
      >
        {authenticated ? (
          <AdminDashboard
            alerts={alerts}
            history={history}
            onChange={onChange}
            onCreate={onCreate}
            onClose={onClose}
            onLogout={onLogout}
            storageError={storageError}
          />
        ) : (
          <AdminLogin onLogin={onLogin} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
