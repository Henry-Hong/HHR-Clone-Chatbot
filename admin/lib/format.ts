const UNITS: [limit: number, divisor: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [60_000, 1_000, 'second'],
  [3_600_000, 60_000, 'minute'],
  [86_400_000, 3_600_000, 'hour'],
  [2_592_000_000, 86_400_000, 'day'],
];

const relative = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });
const absolute = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });

/** "3분 전" 처럼. 한 달이 넘으면 절대 시각으로 떨어진다. */
export const timeAgo = (iso: string): string => {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return '-';
  const diff = at - Date.now();
  const abs = Math.abs(diff);
  for (const [limit, divisor, unit] of UNITS) {
    if (abs < limit) return relative.format(Math.round(diff / divisor), unit);
  }
  return absolute.format(at);
};

export const fullTime = (iso: string): string => {
  const at = new Date(iso).getTime();
  return Number.isNaN(at) ? '-' : absolute.format(at);
};
