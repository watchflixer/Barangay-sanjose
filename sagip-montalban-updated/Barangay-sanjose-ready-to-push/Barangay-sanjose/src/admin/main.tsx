import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import AdminApp from './AdminApp';
import 'leaflet/dist/leaflet.css';
import './admin.css';

// Only the standalone /admin.html page owns the document body.
document.body.classList.add('admin-standalone');

createRoot(document.getElementById('root')!).render(
  <StrictMode><ErrorBoundary><AdminApp /></ErrorBoundary></StrictMode>,
);
