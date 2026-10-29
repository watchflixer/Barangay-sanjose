import React, { useEffect, useRef, useState } from 'react';
import { AdminLogin, type AdminLoginResult } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import type { HazardAlert, HazardDraft } from '../types';
import type { AdminChange, ReportAction } from '../lib/admin';
import type { ResolveFlag } from '../lib/reportsApi';

interface Props {
  isOpen: boolean;
  authenticated: boolean;
  onLogin: (email: string, password: string) => Promise<AdminLoginResult>;
  onVerify: (code: string) => Promise<AdminLoginResult>;
  onLogout: () => void;
  onClose: () => void;
  alerts: HazardAlert[];
  history: ReportAction[];
  flags: ResolveFlag[];
  hiddenTypes: HazardAlert['type'][];
  onChange: (id: string, change: AdminChange) => Promise<void> | void;
  onCreate: (draft: HazardDraft) => Promise<HazardAlert | undefined> | HazardAlert | undefined;
  onReviewFlag: (id: string, decision: 'accepted' | 'ignored') => Promise<void> | void;
  onSetHiddenTypes: (types: HazardAlert['type'][]) => Promise<void> | void;
  syncError: string;
  loading: boolean;
}

export function AdminPortal({
  isOpen,
  authenticated,
  onLogin,
  onVerify,
  onLogout,
  onClose,
  alerts,
  history,
  flags,
  hiddenTypes,
  onChange,
  onCreate,
  onReviewFlag,
  onSetHiddenTypes,
  syncError,
  loading,
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
            flags={flags}
            hiddenTypes={hiddenTypes}
            onChange={onChange}
            onCreate={onCreate}
            onReviewFlag={onReviewFlag}
            onSetHiddenTypes={onSetHiddenTypes}
            onClose={onClose}
            onLogout={onLogout}
            syncError={syncError}
            loading={loading}
          />
        ) : (
          <AdminLogin onLogin={onLogin} onVerify={onVerify} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
