const money0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const fmtMoney = (n: number) => money0.format(n);
export const fmtCompactMoney = (n: number) => (n < 0 ? '-$' : '$') + compact.format(Math.abs(n));
export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmtPct = (n: number, digits = 1) =>
  `${n >= 0 ? '' : '-'}${Math.abs(n * 100).toFixed(digits)}%`;
export const fmtSignedPct = (n: number, digits = 1) =>
  `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n * 100).toFixed(digits)}%`;

export function fmtDate(v: unknown): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const safeDiv = (a: number, b: number) => (b ? a / b : 0);
