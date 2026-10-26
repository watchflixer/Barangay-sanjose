import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
// Leaflet 2 ships its own stylesheet; bundling it keeps the CSS in step with
// the installed library and removes the CDN dependency.
import 'leaflet/dist/leaflet.css';

/**
 * FOCUS RING MODALITY
 * -------------------
 * Chrome on Android / iOS Safari keep a dark focus ring on the control that
 * was just tapped — the "button turned black after I clicked it" report.
 * index.css suppresses it for pointer input and only draws the teal ring when
 * `html.kb-nav` is present, so we add that class as soon as the user navigates
 * with the keyboard (Tab / arrows / Enter) and drop it on the next touch.
 */
{
  const root = document.documentElement;
  const markKeyboard = (event: KeyboardEvent) => {
    if (
      event.key === 'Tab' ||
      event.key.startsWith('Arrow') ||
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      root.classList.add('kb-nav');
    }
  };
  const markPointer = () => root.classList.remove('kb-nav');
  window.addEventListener('keydown', markKeyboard, true);
  window.addEventListener('pointerdown', markPointer, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
