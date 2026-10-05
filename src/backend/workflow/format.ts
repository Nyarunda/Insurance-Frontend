/**
 * Display rules for workflow data (FI1-B, FI1-Q6).
 *
 * - Codes are shown in words by a generic rule (`POLICY_ENDORSEMENT_APPROVAL` → "Policy endorsement
 *   approval"); there is no per-code vocabulary in the client.
 * - Identifiers and hashes are never shown: a fact whose key ends in `_id` or `_hash`, or whose value
 *   is a UUID, is left out.
 * - People: the signed-in user is "You", the system is "System", anyone else is described by the
 *   stage they acted at. Names are never invented and IDs never shown.
 */

import type { HistoryEntry } from './types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): boolean => typeof value === 'string' && UUID_RE.test(value);

export function humanize(code: string | null | undefined): string {
  if (!code) return '';
  const words = code.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * A recorded reason, readable: the backend writes some as `CODE: detail` (for example a void's
 * `ENDORSEMENT_BASE_STALE: V1 superseded by V2`); the code reads as words and the detail is kept.
 */
export function readableReason(text: string): string {
  const match = /^([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)(?::\s*(.*))?$/s.exec(text.trim());
  if (!match) return text.trim();
  return match[2] ? `${humanize(match[1])}: ${match[2]}` : humanize(match[1]);
}

/** A backend `required_action`: a code reads as words, a sentence is shown as the backend wrote it. */
export function requiredActionText(value: string): string {
  return /^[A-Z0-9_]+$/.test(value.trim()) ? humanize(value) : value.trim();
}

export function formatMoney(amount: string | null, currency: string | null, reason?: string | null): string {
  if (amount === null) {
    return reason === 'FX_NOT_AVAILABLE'
      ? `Not available in the base currency${currency ? ` (${currency})` : ''}`
      : '—';
  }
  const value = Number(amount);
  const formatted = Number.isFinite(value)
    ? value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : amount;
  return currency ? `${currency} ${formatted}` : formatted;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export interface FactRow {
  label: string;
  value: string;
}

/** The approval facts a person can read: no identifiers, no hashes, no nested structures. */
export function displayFacts(facts: Record<string, unknown> | null | undefined): FactRow[] {
  if (!facts) return [];
  return Object.entries(facts)
    .filter(([key, value]) => {
      if (/_id$|_hash$/.test(key) || key === 'action') return false;
      if (value === null || value === undefined || value === '') return false;
      if (typeof value === 'object') return false;
      return !isUuid(value);
    })
    .map(([key, value]) => ({
      label: humanize(key),
      // Codes such as CHANGE_LIMIT read as words; references such as END0000001 stay as they are.
      value: typeof value === 'string' && /^[A-Z]+(?:_[A-Z0-9]+)+$/.test(value) ? humanize(value) : String(value),
    }));
}

/** Who acted, without names or identifiers. */
export function actorLabel(entry: HistoryEntry, currentUserId: string | null | undefined): string {
  if (entry.actor_kind === 'SYSTEM' || !entry.actor_user_id) return 'System';
  if (currentUserId && entry.actor_user_id === currentUserId) return entry.acting_for_user_id ? 'You, for a colleague' : 'You';
  if (entry.stage) return `${humanize(entry.stage)} approver`;
  return entry.action === 'SUBMIT' || entry.action === 'START' ? 'Requester' : 'Another user';
}

// ---------------------------------------------------------------------------- RUP1-F1 decision facts

/** The facts the checker decides on, shown first and in words; the rest are listed after them. */
export const DECISION_KEYS = [
  'endorsement_type',
  'policy_no',
  'base_version_no',
  'benefit',
  'benefit_name',
  'previous_limit_amount',
  'new_limit_amount',
  'effective_date',
  'request_reason',
] as const;

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);

/** A calendar date (`YYYY-MM-DD`) as "05 Oct 2026", never shifted by the viewer's time zone. */
function calendarDate(value: unknown): string | null {
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) return text(value);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Limits are in the policy's own currency, which the facts carry; the task's currency may be the base one. */
const limitCurrency = (facts: Record<string, unknown>, fallback: string | null) => text(facts.transaction_currency) ?? fallback;

const money = (amount: unknown, currency: string | null) =>
  typeof amount === 'string' && amount !== '' ? formatMoney(amount, currency) : null;

/** "Windscreen: KES 80,000.00 → KES 100,000.00", or null when the facts carry no limit change. */
export function changeSummary(facts: Record<string, unknown> | null | undefined, fallbackCurrency: string | null): string | null {
  if (!facts) return null;
  const currency = limitCurrency(facts, fallbackCurrency);
  const benefit = text(facts.benefit_name) ?? (text(facts.benefit) ? humanize(String(facts.benefit)) : null);
  const to = money(facts.new_limit_amount, currency);
  if (!benefit || !to) return null;
  const from = money(facts.previous_limit_amount, currency) ?? 'No limit stated';
  return `${benefit}: ${from} → ${to}`;
}

/** The decision block of the approval page: what was asked for, in words. Missing facts are left out. */
export function decisionFacts(facts: Record<string, unknown> | null | undefined, fallbackCurrency: string | null): FactRow[] {
  if (!facts) return [];
  const currency = limitCurrency(facts, fallbackCurrency);
  const rows: Array<[string, string | null]> = [
    ['Type', text(facts.endorsement_type) ? humanize(String(facts.endorsement_type)) : null],
    ['Policy', text(facts.policy_no)],
    ['Base version', typeof facts.base_version_no === 'number' ? `Version ${facts.base_version_no}` : null],
    ['Benefit', text(facts.benefit_name) ?? (text(facts.benefit) ? humanize(String(facts.benefit)) : null)],
    [
      'Current limit',
      text(facts.new_limit_amount) ? money(facts.previous_limit_amount, currency) ?? 'No limit stated' : null,
    ],
    ['New limit', money(facts.new_limit_amount, currency)],
    ['Effective from', calendarDate(facts.effective_date)],
    ["Maker's reason", text(facts.request_reason)],
  ];
  return rows.filter((row): row is [string, string] => row[1] !== null).map(([label, value]) => ({ label, value }));
}
