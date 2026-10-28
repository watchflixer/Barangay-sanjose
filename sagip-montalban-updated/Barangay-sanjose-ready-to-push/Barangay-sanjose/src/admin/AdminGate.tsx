import { useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react';
import { isAdminUnlocked, lockAdmin, unlockAdmin, usingDefaultCredentials } from './gate';

interface AdminGateProps {
  onUnlocked: () => void;
  onClose: () => void;
}

/**
 * The hidden sign-in card that replaces the incident list while the secret
 * word is typed in the feed search box. Deliberately small and quiet: no
 * mention of it anywhere else in the public interface.
 */
export function AdminGate({ onUnlocked, onClose }: AdminGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const alreadyOpen = isAdminUnlocked();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    // A tiny delay keeps the card from flashing on an accidental Enter.
    window.setTimeout(() => {
      const result = unlockAdmin(email, password);
      setBusy(false);
      if (result.ok) {
        setError('');
        setEmail('');
        setPassword('');
        onUnlocked();
      } else {
        setError(result.message || 'Mali ang credentials. Subukan muli.');
      }
    }, 220);
  };

  return (
    <div className="mx-auto w-full max-w-[19rem] px-1 pb-4 pt-2">
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_8px_30px_rgba(15,42,33,0.08)]">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Restricted</p>
              <h3 className="text-sm font-bold text-slate-900">Admin sign in</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close admin sign in" className="grid h-6 w-6 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {alreadyOpen ? (
          <div className="space-y-3">
            <p className="text-[11px] leading-relaxed text-slate-600">Naka-sign in ka na bilang admin sa session na ito.</p>
            <button type="button" onClick={onUnlocked} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
              Buksan ang admin workspace
            </button>
            <button type="button" onClick={() => { lockAdmin(); setError(''); }} className="w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">
              Mag-sign out
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-2.5">
            <p className="text-[10.5px] leading-snug text-slate-500">
              Para sa awtorisadong barangay staff lamang.
            </p>
            {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10.5px] font-medium text-rose-700">{error}</p>}
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</span>
              <input
                type="text"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setError(''); }}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                placeholder="admin"
                aria-label="Admin email"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Password</span>
              <span className="relative block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setError(''); }}
                  autoComplete="current-password"
                  required
                  placeholder="••••••"
                  aria-label="Admin password"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-9 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </span>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
              {busy ? 'Sinusuri…' : 'Unlock admin'}
            </button>
            {usingDefaultCredentials() && (
              <p className="text-[9.5px] leading-snug text-slate-400">
                Local gate only — shared database changes still need a real Supabase admin account.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
