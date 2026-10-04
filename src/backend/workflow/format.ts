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
