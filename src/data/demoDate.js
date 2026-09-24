// Shared demo clock utility - anchors all dates relative to "today"
// so dashboards always contain useful upcoming appointments and reminders

export function getDemoDate() {
  return new Date();
}

export function getDemoToday() {
  const d = getDemoDate();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysFromNow(n) {
  const d = getDemoToday();
  d.setDate(d.getDate() + n);
  return d;
}

export function daysAgo(n) {
  return daysFromNow(-n);
}

export function formatDate(date, opts = {}) {
  if (!date) return '';
  const d = new Date(date);
  const defaults = { year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleDateString('en-IN', { ...defaults, ...opts });
}

export function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDateTime(date) {
  if (!date) return '';
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function toISODate(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export function toISODateTime(date) {
  return new Date(date).toISOString();
}

export function isToday(date) {
  const d = new Date(date);
  const today = getDemoToday();
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

export function isPast(date) {
  return new Date(date) < getDemoToday();
}

export function isFuture(date) {
  return new Date(date) > getDemoToday();
}

export function daysBetween(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}
