/** Proposal words and colours. The server owns every rule; these only label its answers. */

import type { StatusTone } from '../../components/horizon';
import { humanize } from '../workflow/format';
import type { Blocker, ProposalStatus, Requirement } from './types';

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'Under review',
  REFERRED: 'Referred',
  READY_TO_BIND: 'Ready to bind',
  BOUND: 'Bound',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
};

export const PROPOSAL_TONE: Record<ProposalStatus, StatusTone> = {
  DRAFT: 'info',
  UNDER_REVIEW: 'warning',
  REFERRED: 'warning',
  READY_TO_BIND: 'success',
  BOUND: 'success',
  DECLINED: 'danger',
  CANCELLED: 'neutral',
};

/** Workflow statuses in which an approval is still open (the backend's NON_TERMINAL_STATUSES). */
export const OPEN_WORKFLOW = ['PENDING_APPROVAL', 'REFERRED', 'RETURNED_FOR_REWORK'];

/** The referral conditions the system raises (U1-D8), in words; anything else is humanized. */
const EXCEPTION_LABEL: Record<string, string> = {
  BACKDATED_INCEPTION: 'Inception before today',
  INCEPTION_AFTER_QUOTE_VALIDITY: "Cover starts after the offer's validity",
  BINDER_LIMIT_EXCEEDED: 'Sum insured above the binder limit',
  SUM_INSURED_CHANGED: 'Sum insured differs from the rated figure',
  UNDERWRITER_REFERRAL: "Underwriter's referral",
};
export const exceptionLabel = (code: string) => EXCEPTION_LABEL[code] ?? humanize(code);

/** A readiness blocker in words, naming the requirement or exception it concerns. */
export function blockerText(blocker: Blocker, requirements: Requirement[]): string {
  switch (blocker.code) {
    case 'EXCEPTION_OPEN':
      return `${exceptionLabel(blocker.item)} awaits approval`;
    case 'REQUIREMENT_OUTSTANDING': {
      const requirement = requirements.find((item) => item.code === blocker.item);
      return `Evidence missing: ${requirement?.name ?? humanize(blocker.item)}`;
    }
    case 'CUSTOMER_KYC_NOT_VERIFIED':
      return `The customer's KYC is ${humanize(blocker.item).toLowerCase()}, not verified`;
    default:
      return blocker.message;
  }
}
