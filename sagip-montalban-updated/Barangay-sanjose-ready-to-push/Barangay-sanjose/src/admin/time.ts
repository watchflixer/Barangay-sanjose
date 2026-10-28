/** "12 minuto ang nakalipas" / "3 oras ang nakalipas" / "2 araw ang nakalipas". */
export function relativeTime(value?: string, now = Date.now()): string {
  if (!value) return 'Walang timestamp';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Walang timestamp';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) return 'Ngayon lang';
  const minutes = Math.round(seconds / 60);
  if (minutes < 2) return '1 minuto ang nakalipas';
  if (minutes < 60) return `${minutes} minuto ang nakalipas`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} oras ang nakalipas`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} araw ang nakalipas`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} buwan ang nakalipas`;
  return `${Math.round(months / 12)} taon ang nakalipas`;
}

export function exactTime(value?: string): string {
  if (!value) return 'Walang timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}
