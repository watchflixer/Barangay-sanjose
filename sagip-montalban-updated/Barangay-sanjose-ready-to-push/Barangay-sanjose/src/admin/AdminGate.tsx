import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, Eye, EyeOff, Info, Loader2, MapPin, ShieldCheck, X } from 'lucide-react';
import { isAdminUnlocked, lockAdmin, unlockAdmin, usingDefaultCredentials } from './gate';

interface AdminGateProps {
  onUnlocked: () => void;
  onClose: () => void;
}

/**
 * The hidden sign-in screen. It replaces the incident list the moment the
 * secret word is typed in the feed search box, and portals itself to the top of
 * the document so it always covers the whole app.
 *
 * Note: this is a local convenience door, not real authentication — the shared
 * database is still protected by Supabase accounts and row-level security.
 */
export function AdminGate({ onUnlocked, onClose }: AdminGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [alreadyOpen, setAlreadyOpen] = useState(() => isAdminUnlocked());
  const emailRef = useRef<HTMLInputElement>(null);

  // Lock the page behind the dialog and let Escape dismiss it.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Capture phase: the public app also listens for Escape and would
    // otherwise swallow it before this dialog sees the key.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    const focusTimer = window.setTimeout(() => {
      const target = document.querySelector<HTMLInputElement>('[data-gate-focus]');
      target?.focus({ preventScroll: true });
    }, 120);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey, true);
      window.clearTimeout(focusTimer);
    };
  }, [onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    // Small delay so the button does not flash on an accidental Enter.
    window.setTimeout(() => {
      const result = unlockAdmin(email, password);
      setBusy(false);
      if (result.ok) {
        setEmail('');
        setPassword('');
        setAlreadyOpen(true);
        onUnlocked();
      } else {
        setError(result.message || 'Wrong email or password. Please try again.');
      }
    }, 260);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[6000] flex flex-col overflow-y-auto bg-[#0b1a24]/55 px-3 py-4 backdrop-blur-[5px] sm:px-5 sm:py-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-gate-title"
        className="relative m-auto grid w-full max-w-[1060px] overflow-hidden rounded-[22px] bg-white shadow-[0_40px_90px_-30px_rgba(8,26,20,0.55)] ring-1 ring-black/5 sm:rounded-[26px] lg:grid-cols-[1.02fr_1fr]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close admin sign in"
          className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-[#f1f3f4] text-[#3c4043] transition hover:bg-[#e4e7e9] hover:text-[#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8] lg:right-4 lg:top-4"
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </button>

        {/* ---------------- Brand panel ---------------- */}
        <div className="relative hidden flex-col overflow-hidden bg-[linear-gradient(160deg,#eef5ff_0%,#f6faff_45%,#ffffff_100%)] px-9 py-8 lg:flex xl:px-12 xl:py-10">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-white text-[#1a73e8] shadow-[0_1px_2px_rgba(60,64,67,0.18),0_6px_16px_-8px_rgba(26,115,232,0.45)]">
              <ShieldCheck className="h-6 w-6" strokeWidth={2} />
            </span>
            <span className="leading-tight">
              <span className="block text-[22px] font-bold tracking-[-0.03em] text-[#0b1520]">
                San Jose<span className="text-[#1a73e8]">.</span>
              </span>
              <span className="mt-1 block text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#5f6b76]">
                Community hazard monitoring
              </span>
            </span>
          </div>

          <div className="relative z-10 mt-10 xl:mt-12">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1a73e8]">
              Small actions. Real impact.
            </span>
            <h2 className="mt-3 text-[38px] font-bold leading-[1.08] tracking-[-0.035em] text-[#0b1520] xl:text-[42px]">
              A clearer view.
              <br />
              A safer community.
            </h2>
            <p className="mt-4 max-w-[19rem] text-[13.5px] leading-[1.7] text-[#5f6b76]">
              A little care goes a long way. Let&rsquo;s look out for San Jose, together.
            </p>
          </div>

          <GateIllustration />

          <div className="relative z-10 mt-auto flex items-center gap-3 rounded-[14px] border border-[#e3ebf6] bg-white/85 px-4 py-3 shadow-[0_1px_2px_rgba(60,64,67,0.08)] backdrop-blur">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6f4ea] text-[#188038]">
              <Check className="h-4 w-4" strokeWidth={2.6} />
            </span>
            <span className="min-w-0">
              <strong className="block text-[12.5px] font-bold text-[#111d29]">Community first.</strong>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-[#5f6b76]">
                Every report makes a difference.
              </span>
            </span>
            <Check className="ml-auto h-4 w-4 shrink-0 text-[#34a853]" strokeWidth={2.6} />
          </div>

          <p className="relative z-10 mt-6 flex items-center justify-center gap-1.5 text-[11px] text-[#6b7783]">
            <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
            Barangay San Jose, Rodriguez, Rizal
          </p>
        </div>

        {/* ---------------- Form panel ---------------- */}
        <div className="flex flex-col px-6 py-8 sm:px-10 sm:py-10 lg:px-11">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#e8f0fe] text-[#1a73e8]">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-[17px] font-bold tracking-[-0.02em] text-[#0b1520]">
              San Jose<span className="text-[#1a73e8]">.</span>
            </span>
          </div>

          <span className="inline-flex w-fit items-center gap-1.5 rounded-[7px] border border-[#e6e9ee] bg-[#f8fafc] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#3c4043]">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
            Admin workspace
          </span>

          <h1
            id="admin-gate-title"
            className="mt-5 text-[30px] font-bold leading-tight tracking-[-0.04em] text-[#0b1520] sm:text-[34px]"
          >
            Admin login
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#5f6b76]">
            Welcome back. Pick up where you left off.
          </p>

          {alreadyOpen ? (
            <div className="mt-7 space-y-3">
              <div className="rounded-[14px] border border-[#dceadf] bg-[#f4fbf5] px-4 py-3.5">
                <strong className="block text-[13px] font-bold text-[#111d29]">
                  Naka-sign in ka na sa device na ito.
                </strong>
                <span className="mt-1 block text-[12px] leading-relaxed text-[#5f6b76]">
                  Puwede mong buksan agad ang admin workspace, o mag-sign out para sa ibang tao.
                </span>
              </div>
              <button
                type="button"
                onClick={onUnlocked}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#1a73e8] text-[14px] font-semibold text-white shadow-[0_1px_3px_rgba(26,115,232,0.4)] transition hover:bg-[#1765cc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8]"
              >
                Buksan ang admin workspace <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
              </button>
              <button
                type="button"
                onClick={() => {
                  lockAdmin();
                  setAlreadyOpen(false);
                  setError('');
                }}
                className="h-11 w-full rounded-[12px] border border-[#e0e4e8] text-[13px] font-semibold text-[#3c4043] transition hover:bg-[#f8fafc]"
              >
                Mag-sign out
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 flex flex-col">
              {error && (
                <p
                  role="alert"
                  className="mb-4 rounded-[10px] border border-[#f4c7c3] bg-[#fce8e6] px-3.5 py-2.5 text-[12.5px] font-medium leading-snug text-[#a50e0e]"
                >
                  {error}
                </p>
              )}

              <GateField
                id="admin-gate-email"
                label="Email"
                type="text"
                value={email}
                autoComplete="username"
                placeholder="admin"
                onChange={(value) => {
                  setEmail(value);
                  setError('');
                }}
                inputRef={emailRef}
              />

              <GateField
                id="admin-gate-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoComplete="current-password"
                placeholder="••••••••"
                onChange={(value) => {
                  setPassword(value);
                  setError('');
                }}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="grid h-8 w-8 place-items-center rounded-full text-[#5f6368] transition hover:bg-[#f1f3f4] hover:text-[#111]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <p className="mt-4 text-[12px] leading-relaxed text-[#5f6b76]">
                Your community dashboard is one step away.
              </p>

              <button
                type="submit"
                disabled={busy}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#1a73e8] text-[14px] font-semibold text-white shadow-[0_1px_3px_rgba(26,115,232,0.4)] transition hover:bg-[#1765cc] disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8]"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} /> Signing in…
                  </>
                ) : (
                  <>
                    Sign in <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                  </>
                )}
              </button>

              <div className="mt-6 flex items-start gap-2.5 border-t border-[#eceff1] pt-5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#5f6368]" strokeWidth={2} />
                <div>
                  <strong className="block text-[12px] font-bold text-[#111d29]">
                    Demo workspace &middot; This device only
                  </strong>
                  <span className="mt-1 block text-[11.5px] leading-relaxed text-[#5f6b76]">
                    Not secure authentication. Use the demo details only; never enter real personal
                    information.
                  </span>
                  {usingDefaultCredentials() && (
                    <span className="mt-1.5 block text-[11px] text-[#6b7783]">
                      Sign in with <b className="text-[#111d29]">admin</b> / <b className="text-[#111d29]">admin</b>.
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 text-[11px] text-[#7c8792]">
                <span>Made for our community</span>
                <span className="flex gap-1.5">
                  <i className="h-1.5 w-1.5 rounded-full bg-[#dadce0]" />
                  <i className="h-1.5 w-1.5 rounded-full bg-[#dadce0]" />
                  <i className="h-1.5 w-1.5 rounded-full bg-[#1a73e8]" />
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function GateField({
  id, label, type, value, placeholder, autoComplete, onChange, trailing, inputRef,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
  trailing?: React.ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className="relative mb-3.5">
      <input
        id={id}
        ref={inputRef}
        type={type}
        value={value}
        required
        autoCapitalize="none"
        spellCheck={false}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-label={`Admin ${label.toLowerCase()}`}
        data-gate-focus={label === 'Email' ? '' : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="peer h-[58px] w-full rounded-[12px] border border-[#dde1e6] bg-white px-4 pb-2 pt-6 text-[14px] font-medium text-[#0b1520] outline-none transition placeholder:text-[#9aa3ab] hover:border-[#c4cbd2] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/15"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium text-[#5f6b76]"
      >
        {label}
      </label>
      {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
    </div>
  );
}

/** Decorative isometric mini-map for the brand panel. */
function GateIllustration() {
  return (
    <svg
      viewBox="0 0 440 250"
      aria-hidden="true"
      className="pointer-events-none relative z-0 mx-auto mt-6 w-full max-w-[24rem] select-none"
    >
      <defs>
        <linearGradient id="gate-pin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4b9bfa" />
          <stop offset="100%" stopColor="#1a73e8" />
        </linearGradient>
        <linearGradient id="gate-floor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f2f7ff" />
          <stop offset="100%" stopColor="#e5eefc" />
        </linearGradient>
        <radialGradient id="gate-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#1a73e8" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#1a73e8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* isometric ground plane */}
      <path d="M220 42 396 130 220 218 44 130Z" fill="url(#gate-floor)" />
      <path d="M220 42 396 130 220 218 44 130Z" fill="none" stroke="#d8e5f8" strokeWidth="1.5" />

      {/* inner streets */}
      <g fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" opacity="0.95">
        <path d="M104 96h116l96 48" />
        <path d="M140 154h56l60-30" />
      </g>
      <g fill="none" stroke="#d4e3f8" strokeWidth="1.2" strokeLinecap="round" opacity="0.9">
        <path d="M104 96h116l96 48" />
        <path d="M140 154h56l60-30" />
      </g>

      {/* building blocks */}
      <g>
        <path d="M150 76 178 90 150 104 122 90Z" fill="#ffffff" stroke="#dbe7f9" strokeWidth="1.2" />
        <path d="M122 90v30l28 14V104Z" fill="#e8f0fb" />
        <path d="M178 90v30l-28 14V104Z" fill="#d9e6f8" />

        <path d="M236 118 272 136 236 154 200 136Z" fill="#ffffff" stroke="#dbe7f9" strokeWidth="1.2" />
        <path d="M200 136v26l36 18v-26Z" fill="#e8f0fb" />
        <path d="M272 136v26l-36 18v-26Z" fill="#d9e6f8" />

        <path d="M300 78 328 92 300 106 272 92Z" fill="#ffffff" stroke="#dbe7f9" strokeWidth="1.2" />
        <path d="M272 92v22l28 14V106Z" fill="#e8f0fb" />
        <path d="M328 92v22l-28 14V106Z" fill="#d9e6f8" />

        <path d="M112 138 138 151 112 164 86 151Z" fill="#ffffff" stroke="#dbe7f9" strokeWidth="1.2" />
        <path d="M86 151v18l26 13v-18Z" fill="#e8f0fb" />
        <path d="M138 151v18l-26 13v-18Z" fill="#d9e6f8" />
      </g>

      {/* route */}
      <path
        d="M110 112 168 140 216 112 286 146 330 118"
        fill="none"
        stroke="#1a73e8"
        strokeWidth="2.4"
        strokeDasharray="7 7"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="110" cy="112" r="5.5" fill="#ffffff" stroke="#34a853" strokeWidth="3" />
      <circle cx="330" cy="118" r="5.5" fill="#ffffff" stroke="#fbbc04" strokeWidth="3" />

      {/* pin */}
      <ellipse cx="216" cy="158" rx="34" ry="10" fill="url(#gate-shadow)" />
      <path
        d="M216 60c-19.3 0-35 15.7-35 35 0 25.9 35 57 35 57s35-31.1 35-57c0-19.3-15.7-35-35-35Z"
        fill="url(#gate-pin)"
      />
      <path d="M216 60c-19.3 0-35 15.7-35 35h70c0-19.3-15.7-35-35-35Z" fill="#ffffff" opacity="0.16" />
      <circle cx="216" cy="95" r="17" fill="#ffffff" />
      <path
        d="M216 84.5 224 88v6.2c0 4.6-3.2 8.6-8 10.1-4.8-1.5-8-5.5-8-10.1V88l8-3.5Z"
        fill="#1a73e8"
      />
      <path d="m212.4 94.6 2.6 2.6 4.8-5" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
