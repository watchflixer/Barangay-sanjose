// Leaflet popups accept raw HTML, unlike React text nodes.
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
export function safeImageUrl(value: string): string {
  return /^(https?:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,|\.?\.?\/|[\w-]+\/)/i.test(value) ? escapeHtml(value) : '';
}
