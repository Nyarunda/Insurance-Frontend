/**
 * A money amount as people type it (RUP1 F-8): "55000", "55,000" and "1,250,000.50" are all
 * accepted, commas only between groups of three digits. The field keeps what was typed; the
 * server receives plain digits ("55000"), never the commas. Anything else gets a message that
 * says exactly what is wrong.
 */

export const AMOUNT_MESSAGES = {
  missing: 'Give the new limit as a positive amount.',
  notNumber: 'Enter the amount in digits, for example 55,000 or 55000.50.',
  grouping: 'Put commas only between groups of three digits, for example 55,000.',
  decimals: 'Use at most two decimal places.',
  zero: 'The new limit must be more than zero.',
} as const;

const PLAIN = /^\d+(\.\d+)?$/;
const GROUPED = /^\d{1,3}(,\d{3})+(\.\d+)?$/;

/** Exactly one of `value` (plain digits, to send) and `error` (to show) is set. */
export interface AmountCheck {
  value: string | null;
  error: string | null;
}

const refused = (error: string): AmountCheck => ({ value: null, error });

export function parseAmount(raw: string): AmountCheck {
  const text = raw.trim().replace(/\s+/g, '');
  if (!text) return refused(AMOUNT_MESSAGES.missing);
  if (!PLAIN.test(text) && !GROUPED.test(text)) {
    return refused(/^[\d,]+(\.\d+)?$/.test(text) ? AMOUNT_MESSAGES.grouping : AMOUNT_MESSAGES.notNumber);
  }
  const value = text.replace(/,/g, '');
  if ((value.split('.')[1] ?? '').length > 2) return refused(AMOUNT_MESSAGES.decimals);
  if (Number(value) <= 0) return refused(AMOUNT_MESSAGES.zero);
  return { value, error: null };
}
