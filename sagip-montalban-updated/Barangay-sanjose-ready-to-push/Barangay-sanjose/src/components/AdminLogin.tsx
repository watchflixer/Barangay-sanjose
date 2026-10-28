import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Heart,
  Info,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react';

import './AdminLogin.css';

/** Local administrator sign-in. Not a Google account or a hosted identity service. */
export function AdminLogin({
  onLogin,
  onClose,
}: {
  onLogin: (password: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const passwordInput = useRef<HTMLInputElement>(null);

  return (
    <div className="sj-login">
      <section className="sj-login-story" aria-label="Barangay San Jose">
        <div className="sj-login-brand">
          <span className="sj-login-brand-icon">
            <ShieldCheck size={23} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <p className="sj-login-brand-name">
              San Jose<span className="sj-login-brand-dot">.</span>
            </p>
            <p className="sj-login-brand-caption">COMMUNITY HAZARD MONITORING</p>
          </div>
        </div>
        <div className="sj-login-intro">
          <span className="sj-login-eyebrow">SMALL ACTIONS. REAL IMPACT.</span>
          <h3>
            A clearer view.
            <br />A safer community.
          </h3>
          <p>
            A little care goes a long way.
            <br />
            Let’s look out for San Jose, together.
          </p>
        </div>
        <div className="sj-login-illustration" aria-hidden="true">
          <svg className="sj-login-map" viewBox="0 0 360 250" fill="none">
            <defs>
              <pattern id="sj-login-dots" width="18" height="18" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#c3d5ef" />
              </pattern>
            </defs>
            <rect width="360" height="250" fill="url(#sj-login-dots)" />
            <path
              d="M-10 115 82 65 161 96 249 47 370 96v102l-118-39-88 47-81-32-93 48Z"
              fill="#e2ecfc"
              stroke="#d0dff6"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="m82 65 1 109m78-78 3 110m85-159 3 112" stroke="#c4d7f2" strokeWidth="1.5" />
            <path d="m-10 160 92-48 82 36 88-52 118 49" stroke="white" strokeWidth="12" />
            <path d="m112 43 7 68 59 29 1 99m100-192 6 60 70 24" stroke="white" strokeWidth="7" />
            <path d="m-5 204 88-49 80 30 89-47 111 35" stroke="#b7d5fa" strokeWidth="9" />
            <path
              d="m83 112 81 36 88-52"
              stroke="#4285f4"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="5 7"
            />
            <circle cx="83" cy="112" r="11" fill="white" />
            <circle cx="83" cy="112" r="5" fill="#34a853" />
            <circle cx="252" cy="96" r="11" fill="white" />
            <circle cx="252" cy="96" r="5" fill="#f9ab00" />
            <circle cx="164" cy="148" r="44" fill="#4285f4" fillOpacity=".09" />
            <circle cx="164" cy="148" r="32" fill="#4285f4" fillOpacity=".12" />
            <path
              d="M164 107c-14.4 0-26 11.4-26 25.5 0 20 26 43.5 26 43.5s26-23.5 26-43.5c0-14.1-11.6-25.5-26-25.5Z"
              fill="#1a73e8"
            />
            <path d="m164 120 11 4v9c0 7-11 12-11 12s-11-5-11-12v-9l11-4Z" fill="white" />
            <path
              d="m159 132 3 3 7-7"
              stroke="#1a73e8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="sj-login-map-note">
            <span>
              <Heart size={17} />
            </span>
            <div>
              <strong>Community first.</strong>
              <p>Every report makes a difference.</p>
            </div>
            <Check size={15} className="sj-login-note-check" />
          </div>
        </div>
        <div className="sj-login-location">
          <MapPin size={13} aria-hidden="true" />
          Barangay San Jose, Rodriguez, Rizal
        </div>
      </section>

      <section className="sj-login-main">
        <button type="button" onClick={onClose} aria-label="Close admin" className="sj-login-close">
          <X size={20} />
        </button>
        <div className="sj-login-form-wrap">
          <div className="sj-login-access">
            <LockKeyhole size={12} aria-hidden="true" />
            ADMIN WORKSPACE
          </div>
          <h2 id="admin-title">Admin login</h2>
          <p id="sj-login-description" className="sj-login-subtitle">
            Welcome back. Pick up where you left off.
          </p>
          <form
            className="sj-login-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (checking) return;
              setChecking(true);
              const ok = await onLogin(password).catch(() => false);
              setChecking(false);
              if (ok) {
                setEmail('');
                setPassword('');
                setShowPassword(false);
                setError(false);
              } else {
                setError(true);
                passwordInput.current?.focus();
              }
            }}
            aria-describedby="sj-login-description sj-login-access-note"
          >
            <div className={`sj-login-field ${error ? 'sj-login-field-error' : ''}`}>
              <input
                id="sj-admin-email"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder=" "
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(false);
                }}
                aria-invalid={error || undefined}
                aria-describedby={error ? 'sj-login-error' : undefined}
                required
              />
              <label htmlFor="sj-admin-email">Email</label>
            </div>
            <div className={`sj-login-field sj-login-password ${error ? 'sj-login-field-error' : ''}`}>
              <input
                ref={passwordInput}
                id="sj-admin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder=" "
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(false);
                }}
                aria-invalid={error || undefined}
                aria-describedby={error ? 'sj-login-error' : undefined}
                required
              />
              <label htmlFor="sj-admin-password">Password</label>
              <button
                type="button"
                className="sj-login-reveal"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                aria-controls="sj-admin-password"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {error && (
              <p id="sj-login-error" className="sj-login-error" role="alert">
                <TriangleAlert size={16} aria-hidden="true" />
                <span>That email or password doesn’t match. Try again.</span>
              </p>
            )}
            <p className="sj-login-form-caption">Your community dashboard is one step away.</p>
            <button type="submit" className="sj-login-submit" disabled={checking}>
              <span>{checking ? 'Checking…' : 'Sign in'}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
          <div className="sj-login-access-note" id="sj-login-access-note">
            <Info size={16} aria-hidden="true" />
            <div>
              <p>Admin access · This browser</p>
              <span>
                Sign-in is verified in this browser. Never enter
                <br className="sj-login-desktop-break" /> real personal information you need to keep private.
              </span>
            </div>
          </div>
        </div>
        <footer className="sj-login-footer">
          <span>Made for our community</span>
          <span className="sj-login-footer-mark">
            <span />
            <span />
            <span />
            <span />
          </span>
        </footer>
      </section>
    </div>
  );
}
