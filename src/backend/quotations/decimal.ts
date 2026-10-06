/**
 * A DECIMAL rating factor as people type it (NB1-B-R1, B2). One parser serves both the check and
 * the request, so what passes the check is exactly what is sent: "1200000", "1,200,000" and
 * "1,200,000.50" are accepted (commas only between groups of three digits) and sent as plain
 * digits ("1200000", "1200000.50"). Malformed grouping such as "1,2,00" is refused, never quietly
 * read as 1200, and so is any internal space ("1 200 000", "1 2 00"); only surrounding spaces are
 * ignored (NB1-B-R2). Zero and a leading minus are allowed; the factor's own bounds are checked after.
 */

export const DECIMAL_MESSAGES = {
  notNumber: 'Enter a number in digits, for example 1,200,000 or 1200000.50.',
  grouping: 'Put commas only between groups of three digits, for example 1,200,000.',
} as const;

const PLAIN = /^-?\d+(\.\d+)?$/;
const GROUPED = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;

/** Exactly one of `value` (canonical digits, to send) and `error` (to show) is set; both null when empty. */
export interface DecimalCheck {
  value: string | null;
  error: string | null;
}

export function parseFactorDecimal(raw: string): DecimalCheck {
  // Only surrounding whitespace is ignored; internal spaces ("1 200 000", "12 00") are refused,
  // never deleted into another number (NB1-B-R2).
  const text = raw.trim();
  if (!text) return { value: null, error: null };
  if (PLAIN.test(text) || GROUPED.test(text)) return { value: text.replace(/,/g, ''), error: null };
  return { value: null, error: /^-?[\d,]+(\.\d+)?$/.test(text) ? DECIMAL_MESSAGES.grouping : DECIMAL_MESSAGES.notNumber };
}
