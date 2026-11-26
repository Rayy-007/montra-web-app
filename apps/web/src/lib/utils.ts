import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMMK(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0 MMK';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 MMK';
  return `${new Intl.NumberFormat('en-US').format(Math.round(num))} MMK`;
}

export function formatNumber(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US').format(Math.round(num));
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Formats a date/timestamp as "11/26/2026 2:15PM (Thu)".
 */
export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();

  const hours24 = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const weekday = WEEKDAYS[d.getDay()];

  return `${month}/${day}/${year} ${hours12}:${minutes}${period} (${weekday})`;
}

/**
 * Formats a date (or current time) as "YYYY-MM-DDTHH:mm" in local time for datetime-local inputs.
 */
export function toLocalDateTimeInput(dateInput?: string | Date | null): string {
  const d = dateInput ? (dateInput instanceof Date ? dateInput : new Date(dateInput)) : new Date();
  if (isNaN(d.getTime())) return toLocalDateTimeInput(new Date());

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];
