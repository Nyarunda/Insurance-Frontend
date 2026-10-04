/** Display rules for endorsements (FI1-D). */

import type { StatusTone } from '../../components/horizon';
import type { EndorsementDetail, EndorsementStatus } from './types';

export const ENDORSEMENT_TONE: Record<EndorsementStatus, StatusTone> = {
  DRAFT: 'neutral',
  REFERRED: 'warning',
  EFFECTIVE: 'success',
  DECLINED: 'danger',
  CANCELLED: 'neutral',
};

/** The backend's names for the statuses, where a plain reading of the code would mislead. */
export const ENDORSEMENT_STATUS_LABEL: Record<EndorsementStatus, string> = {
  DRAFT: 'Draft',
  REFERRED: 'Referred',
  EFFECTIVE: 'Effective',
  DECLINED: 'Declined',
  CANCELLED: 'Withdrawn',
};

/**
 * PTH1-D4: a referred endorsement whose approval can no longer happen. The backend gives a
 * `blocker` (for example a newer policy version); a void workflow without one is the same state.
 * Withdraw is the only action left.
 */
export const isNoLongerActionable = (view: EndorsementDetail): boolean =>
  view.status === 'REFERRED' && (view.blocker !== null || view.workflow?.status === 'VOID');

/** The benefit a change-limit endorsement changes, as it reads in the resulting terms. */
export function changedBenefit(view: EndorsementDetail) {
  const code = typeof view.requested_changes.benefit === 'string' ? view.requested_changes.benefit.toUpperCase() : null;
  return code ? view.resulting_terms.cover?.benefits?.find((benefit) => benefit.code === code) ?? null : null;
}

/** A signed amount for a delta: "+ KES 1,000.00", "− KES 250.00", "KES 0.00". */
export function formatDelta(amount: string | null | undefined, currency: string): string {
  if (amount === null || amount === undefined) return '—';
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${currency} ${amount}`;
  const text = `${currency} ${Math.abs(value).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return value > 0 ? `+ ${text}` : value < 0 ? `− ${text}` : text;
}
