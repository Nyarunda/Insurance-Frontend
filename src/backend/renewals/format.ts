/**
 * Renewals in words (RS-A). Statuses, referral reasons and the refusals that need more than the
 * server's own sentence; every other refusal shows the server's message, which is already in words
 * and carries its own dates and limits (the window, the offer's maximum), so none is repeated here.
 */

import { ApiError } from '../../lib/api/errors';
import type { RenewalEffectiveStatus } from './types';

export const RENEWAL_STATUS_LABEL: Record<RenewalEffectiveStatus, string> = {
  DRAFT: 'Draft',
  PRICED: 'Priced',
  OFFERED: 'Offered',
  EXPIRED: 'Offer expired',
  ACCEPTED: 'Accepted by the customer',
  DECLINED: 'Declined by the customer',
  RENEWED: 'Renewed',
  CANCELLED: 'Withdrawn',
};

export const RENEWAL_TONE: Record<RenewalEffectiveStatus, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'neutral',
  PRICED: 'info',
  OFFERED: 'info',
  EXPIRED: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'neutral',
  RENEWED: 'success',
  CANCELLED: 'neutral',
};

/** Why a checker is needed (R1-D7), as recorded by the server at pricing. */
export const CHECK_REASON_TEXT: Record<string, string> = {
  RISK_AMENDED: 'The rated risk was amended',
  SUM_INSURED_INCREASE: 'The sum insured increases',
  COVER_ADDED: 'Cover is added',
  LIMIT_INCREASE: 'A limit increases',
  GEOGRAPHICAL_CHANGE: 'The geographical limit changes',
  PERIOD_NOT_ANNUAL: 'The new period is not a year',
  COVER_GAP: 'The new period does not start the day after expiry: the days between are not covered',
  BACKDATED_INCEPTION: 'The new period starts in the past',
};

export const checkReasonText = (code: string) => CHECK_REASON_TEXT[code] ?? code.toLowerCase().replace(/_/g, ' ');

/** Refusals given more than the server's sentence: what to do next. Anything else is the server's message. */
export function renewalRefusal(error: unknown): { text: string; problems: string[] } | null {
  if (!(error instanceof ApiError)) return null;
  const details = error.details;
  switch (error.code) {
    case 'RENEWAL_EXISTS':
      return { text: 'This policy already has a renewal in progress. Open it from the Renewals tab.', problems: [] };
    case 'RENEWAL_BASE_STALE':
      return {
        text: `The policy changed after this renewal was prepared${typeof details.latest_version_no === 'number' ? ` (version ${details.latest_version_no} is now in force)` : ''}. Withdraw it and prepare it again.`,
        problems: [],
      };
    case 'RENEWAL_NOT_RENEWABLE': {
      const problems = Array.isArray(details.problems)
        ? (details.problems as { message?: unknown }[]).map((item) => (typeof item.message === 'string' ? item.message : '')).filter(Boolean)
        : [];
      return { text: 'The renewal cannot be completed as it stands:', problems };
    }
    case 'RENEWAL_BACKDATE_APPROVAL_REQUIRED':
      return {
        text: `${error.message.charAt(0).toUpperCase()}${error.message.slice(1)}. Prepare it again either from the same date, as a backdated renewal for a checker to approve, or from a later date, leaving the missed days uncovered.`,
        problems: [],
      };
    default:
      return null;
  }
}
