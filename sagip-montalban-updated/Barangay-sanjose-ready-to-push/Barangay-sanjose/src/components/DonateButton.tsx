import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import qrImage from '../../maribank-qr-instapay-transparent.png';

/**
 * Donate button — kaparehong itsura ng ibang navbar buttons (Report / Guide),
 * pero lumalabas ang donation modal kapag pinindot:
 *
 *   - MariBank InstaPay QR (maribank-qr-instapay-transparent.png)
 *   - Account details (NINO IAN DAMGO · 1607 0561 909)
 *   - "Copy account number" button (clipboard API + execCommand fallback,
 *     at huling paraan: auto-select ng numero para sa Ctrl+C) — kaparehong
 *     itsura ng Donate button sa navbar (puti, rounded-md, semibold,
 *     hover:bg-slate-50), pero 1px solid black ang border at itim din ang text
 *   - Step-by-step guide (QR scan / MariBank / GCash)
 *
 * X button lang ang nagsasara ng modal; hindi ito nagsasara sa Escape o
 * pag-click sa labas ng card.
 *
 * Naka-portal ang modal sa `document.body`: nasa loob ito ng Navbar
 * `<header>` (sticky + z-30) bago, at dahil dito ay naka-stacking context
 * ito sa z-30 — kasing-level ng Flood Prone at Traffic iframe overlays
 * (`absolute inset-0 z-30` sa MapViewer) na mas huli sa DOM, kaya
 * tinatakpan ng mapa ang modal kapag bukas ang Flood Prone o Traffic
 * (mukhang patay ang Donate button, bahagyang dumidilim lang ang navbar).
 * Sa portal, nasa root stacking context na ito sa z-[100] kaya laging
 * nasa ibabaw ng mapa at ng iba pang controls.
 *
 * Walang dark/dimming backdrop: transparent ang overlay, kaya normal pa rin
 * ang background. Hinaharang ng overlay ang pag-click sa mga nasa likod nito;
 * ang puting card lang ang nakikita sa ibabaw ng page.
 *
 * Hindi nagbabago ang sukat ng card kapag binuksan ang "How to send (step by
 * step)": naka-lock ang height nito sa collapsed height (sinusukat sa
 * pagbukas, bago ang unang paint), at ang steps na lang ang nag-i-scroll sa
 * loob ng card — may smooth na pag-scroll pababa para agad makita ang steps.
 */

const ACCOUNT_DISPLAY = '1607 0561 909';
const ACCOUNT_PLAIN = '16070561909';
/** QR image — imported from project root, bundled by Vite. */
const QR_SRC = qrImage;

const COPY_LABEL_DEFAULT = 'Copy account number';
const COPY_LABEL_OK = 'Copied';
const COPY_LABEL_BLOCKED = 'Copy blocked: number selected, press Ctrl+C';

/**
 * Hugis ng resibo ng card:
 *  - Tupi (fold) sa kanang-itaas: pinutol ang sulok nang pahilis (mask) at
 *    may nakatuping flap na may gray na shadow sa tabi ng X button.
 *  - Zigzag sa ilalim: sawtooth na mask strip sa bottom edge.
 * Nasa wrapper ang anino (drop-shadow) dahil puputulin ng mask ang
 * box-shadow ng mismong card.
 */
const FOLD_SIZE = 20;
const ZIGZAG_HEIGHT = 8;
const FOLD_CUT_GRADIENT = `linear-gradient(225deg, transparent ${(FOLD_SIZE / Math.SQRT2).toFixed(2)}px, #000 ${(FOLD_SIZE / Math.SQRT2 + 0.01).toFixed(2)}px)`;
const ZIGZAG_TOOTH_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpolygon points='0,0 12,0 6,8' fill='black'/%3E%3C/svg%3E\")";
const RECEIPT_STYLE: React.CSSProperties = {
  WebkitMaskImage: `${FOLD_CUT_GRADIENT}, ${ZIGZAG_TOOTH_SVG}`,
  maskImage: `${FOLD_CUT_GRADIENT}, ${ZIGZAG_TOOTH_SVG}`,
  WebkitMaskSize: `100% calc(100% - ${ZIGZAG_HEIGHT}px), 12px ${ZIGZAG_HEIGHT}px`,
  maskSize: `100% calc(100% - ${ZIGZAG_HEIGHT}px), 12px ${ZIGZAG_HEIGHT}px`,
  WebkitMaskPosition: 'top, bottom',
  maskPosition: 'top, bottom',
  WebkitMaskRepeat: 'no-repeat, repeat-x',
  maskRepeat: 'no-repeat, repeat-x',
};

interface DonateButtonProps {
  className?: string;
}

export const DonateButton: React.FC<DonateButtonProps> = ({ className = '' }) => {
  const [open, setOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState(COPY_LABEL_DEFAULT);
  const [qrFailed, setQrFailed] = useState(false);
  // Naka-lock na height ng card habang bukas ito (collapsed height). Hindi na
  // ito nagbabago kapag binuksan ang "How to send (step by step)" — sa loob
  // na lang ng card nag-i-scroll ang steps imbes na lumaki ang card.
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const acctRef = useRef<HTMLSpanElement>(null);
  const resetTimerRef = useRef<number | null>(null);

  // I-lock ang page scroll habang bukas ang modal; X button lang ang
  // nagsasara nito.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Sukatin ang collapsed height sa sandaling bumukas ang card — bago ang
  // unang paint (useLayoutEffect), kaya walang nakikitang paglukso ng sukat —
  // at i-lock iyon para hindi lumaki ang card kapag binuksan ang details.
  useLayoutEffect(() => {
    if (!open) {
      setLockedHeight(null);
      return;
    }
    if (lockedHeight !== null) return;
    const card = modalRef.current;
    if (!card) return;
    const measured = card.offsetHeight;
    // Walang layout (jsdom, display:none, atbp.) — huwag i-lock, hayaan ang CSS.
    if (!measured) return;
    // Katugma ng max-h-[90vh] na cap sa card, para hindi lumabas sa screen.
    setLockedHeight(Math.min(measured, Math.round(window.innerHeight * 0.9)));
  }, [open, lockedHeight]);

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

  // Kapag binuksan ang "How to send (step by step)", dumudulas pababa ang
  // loob ng card para agad makita ang steps. Naka-lock ang height ng card,
  // kaya hindi ito lumalaki — scroll lang sa loob.
  const handleDetailsToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const details = e.currentTarget;
    const card = modalRef.current;
    if (!details.open || !card) return;
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      const cardRect = card.getBoundingClientRect();
      const detailsRect = details.getBoundingClientRect();
      // I-align ang bukas na details sa itaas ng nakikitang bahagi ng card.
      const top = card.scrollTop + (detailsRect.top - cardRect.top) - 8;
      if (typeof card.scrollTo === 'function') {
        card.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
      } else {
        card.scrollTop = top;
      }
    });
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

      {/* Portal sa document.body — hindi nakakulong sa <header> (z-30) na
          stacking context ng Navbar, kaya hindi na natatakpan ng Flood
          Prone / Traffic iframe at ng iba pang buttons ang Donate card.
          Walang dimming/black backdrop: normal pa rin ang background, at
          buo ang card sa ibabaw ng lahat (z-[100]). */}
      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="relative w-[min(88vw,280px)] max-h-[90vh] drop-shadow-[0_10px_20px_rgba(15,23,42,0.4)]">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Support this project"
            tabIndex={-1}
            style={{
              ...RECEIPT_STYLE,
              ...(lockedHeight !== null ? { height: lockedHeight } : {}),
            }}
            className="w-full max-h-[90vh] overflow-y-auto bg-white p-[.85rem] pb-[calc(.85rem+8px)] text-[13px] leading-[1.4] text-[#111] outline-none custom-scrollbar"
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
                className="flex w-full cursor-pointer items-center justify-center rounded-md border border-black bg-white px-3 py-2 text-center text-xs font-semibold text-black transition-colors hover:bg-slate-50"
              >
                {copyLabel}
              </button>
            </p>

            <details className="mb-[.6rem]" onToggle={handleDetailsToggle}>
              <summary className="cursor-pointer text-[.7rem] font-semibold">
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
          {/* Tupi sa kanang-itaas: nakatuping flap ng pinutol na sulok,
              katabi ng X button, may gray na shadow. */}
          <svg
            aria-hidden="true"
            focusable="false"
            width={FOLD_SIZE}
            height={FOLD_SIZE}
            viewBox={`0 0 ${FOLD_SIZE} ${FOLD_SIZE}`}
            overflow="visible"
            className="pointer-events-none absolute right-0 top-0"
            style={{ filter: 'drop-shadow(-1px 1px 1.5px rgba(100, 116, 139, 0.5))' }}
          >
            <polygon
              points={`0,0 ${FOLD_SIZE},${FOLD_SIZE} 0,${FOLD_SIZE}`}
              fill="#e5e7eb"
            />
          </svg>
          </div>
        </div>,
        document.body)}
    </>
  );
};
