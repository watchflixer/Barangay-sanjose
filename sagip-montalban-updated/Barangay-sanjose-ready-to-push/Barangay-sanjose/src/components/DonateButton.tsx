import React, { useEffect, useRef, useState } from 'react';
import qrImage from '../../maribank-qr-instapay-transparent.png';

/**
 * Donate button — kaparehong itsura ng ibang navbar buttons (Report / Guide),
 * pero lumalabas ang donation modal kapag pinindot:
 *
 *   - MariBank InstaPay QR (maribank-qr-instapay-transparent.png)
 *   - Account details (NINO IAN DAMGO · 1607 0561 909)
 *   - "Copy account number" button (clipboard API + execCommand fallback,
 *     at huling paraan: auto-select ng numero para sa Ctrl+C)
 *   - Step-by-step guide (QR scan / MariBank / GCash)
 *
 * Magsasara ang modal sa Escape o sa pag-click sa labas ng kahon
 * (gaya ng nasa orihinal na standalone HTML).
 */

const ACCOUNT_DISPLAY = '1607 0561 909';
const ACCOUNT_PLAIN = '16070561909';
/** QR image — imported from project root, bundled by Vite. */
const QR_SRC = qrImage;

const COPY_LABEL_DEFAULT = 'Copy account number';
const COPY_LABEL_OK = 'Copied';
const COPY_LABEL_BLOCKED = 'Copy blocked: number selected, press Ctrl+C';

interface DonateButtonProps {
  className?: string;
}

export const DonateButton: React.FC<DonateButtonProps> = ({ className = '' }) => {
  const [open, setOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState(COPY_LABEL_DEFAULT);
  const [qrFailed, setQrFailed] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const acctRef = useRef<HTMLSpanElement>(null);
  const resetTimerRef = useRef<number | null>(null);

  // Escape-to-close at scroll-lock habang bukas ang modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // I-clear ang copy-label timer kapag unmount.
  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    },
    [],
  );

  // Modern API — only works in a secure context with clipboard permission.
  const copyText = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        /* fall through to legacy method */
      }
    }
    // Legacy fallback. The textarea must live inside the modal, because
    // everything outside an open modal dialog cannot take focus.
    const host = modalRef.current;
    if (!host) return false;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.opacity = '0';
    host.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  };

  // Last resort: highlight the number so the user can copy it by hand.
  const selectAccountNumber = () => {
    const el = acctRef.current;
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const handleCopy = async () => {
    const ok = await copyText(ACCOUNT_PLAIN);
    if (ok) {
      setCopyLabel(COPY_LABEL_OK);
    } else {
      selectAccountNumber();
      setCopyLabel(COPY_LABEL_BLOCKED);
    }
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => setCopyLabel(COPY_LABEL_DEFAULT), 3000);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setOpen(false);
  };

  return (
    <>
      <button
        id="btn-donate"
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${className}`}
      >
        Donate
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleOverlayClick}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Support this project"
            tabIndex={-1}
            className="w-[min(88vw,280px)] max-h-[90vh] overflow-y-auto border border-[#111] bg-white p-[.85rem] text-[13px] leading-[1.4] text-[#111] outline-none custom-scrollbar"
          >
            <div className="mb-[.25rem] flex items-center justify-between gap-2">
              <h2 className="text-[1.05rem] font-bold">Support this project</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex h-[11px] w-[28px] shrink-0 cursor-pointer items-center justify-center bg-transparent text-[11px] leading-none font-bold text-[#111] transition-colors hover:text-[#555]"
              >
                X
              </button>
            </div>
            <p className="mb-[.6rem]">Any amount helps. Thank you.</p>

            {qrFailed ? (
              <div className="mx-auto mb-2 flex h-[150px] w-[150px] flex-col items-center justify-center gap-1 border border-dashed border-slate-300 bg-slate-50 text-center text-[10px] font-semibold text-slate-500">
                <span>InstaPay QR</span>
                <span className="text-slate-400">NINO IAN DAMGO</span>
              </div>
            ) : (
              <img
                src={QR_SRC}
                alt="MariBank InstaPay QR code for NINO IAN DAMGO"
                onError={() => setQrFailed(true)}
                className="mx-auto mb-2 block h-[150px] w-[150px] object-contain"
              />
            )}

            <dl className="mb-[.6rem]">
              <dt className="text-[.75rem] text-[#555]">Bank</dt>
              <dd className="mb-[.3rem] font-semibold">MariBank</dd>
              <dt className="text-[.75rem] text-[#555]">Account name</dt>
              <dd className="mb-[.3rem] font-semibold">NINO IAN DAMGO</dd>
              <dt className="text-[.75rem] text-[#555]">Account number</dt>
              <dd className="mb-[.3rem] font-semibold">
                <span id="acct" ref={acctRef}>
                  {ACCOUNT_DISPLAY}
                </span>
              </dd>
            </dl>

            <p className="mb-[.6rem]">
              <button
                id="copy"
                type="button"
                onClick={handleCopy}
                className="w-full cursor-pointer rounded-lg border-0 bg-[#ee6a00] px-3 py-[.55rem] text-[.9rem] font-semibold tracking-[.01em] text-white shadow-[0_2px_0_#b84f00] transition-[background,shadow] hover:bg-[#d95a00] active:shadow-[0_0_0_#b84f00]"
              >
                {copyLabel}
              </button>
            </p>

            <details className="mb-[.6rem]">
              <summary className="cursor-pointer text-[.85rem] font-semibold">
                How to send (step by step)
              </summary>

              <h4 className="mt-[.5rem] mb-[.2rem] text-[.85rem] font-bold">
                Option 1: Scan the QR code (any bank or e-wallet)
              </h4>
              <ol className="mb-[.4rem] list-decimal pl-[1.1rem] text-[.85rem]">
                <li>Open your bank or e-wallet app.</li>
                <li>Tap Scan QR (or Pay QR).</li>
                <li>Scan the QR code above.</li>
                <li>Check that the name shown is NINO IAN DAMGO.</li>
                <li>Enter the amount and confirm.</li>
              </ol>

              <h4 className="mt-[.5rem] mb-[.2rem] text-[.85rem] font-bold">
                Option 2: From MariBank
              </h4>
              <ol className="mb-[.4rem] list-decimal pl-[1.1rem] text-[.85rem]">
                <li>Open the MariBank app and tap Transfer.</li>
                <li>Choose MariBank and enter account number 1607 0561 909.</li>
                <li>Check that the name shown is NINO IAN DAMGO.</li>
                <li>Enter the amount and confirm.</li>
              </ol>

              <h4 className="mt-[.5rem] mb-[.2rem] text-[.85rem] font-bold">
                Option 3: From GCash
              </h4>
              <ol className="mb-[.4rem] list-decimal pl-[1.1rem] text-[.85rem]">
                <li>Open GCash and tap Transfer, then Bank Transfer.</li>
                <li>Select MariBank as the bank.</li>
                <li>Enter account number 1607 0561 909 and the account name NINO IAN DAMGO.</li>
                <li>Enter the amount and confirm.</li>
              </ol>
            </details>
          </div>
        </div>
      )}
    </>
  );
};
