/** Customer words and colours for the screen. The server owns every rule; these only label its answers. */

import type { StatusTone } from '../../components/horizon';
import type { CustomerStatus, CustomerType, KycStatus } from './types';

export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  INDIVIDUAL: 'Individual',
  CORPORATE: 'Company',
  GROUP: 'Group',
};

export const STATUS_TONE: Record<CustomerStatus, StatusTone> = {
  PROSPECT: 'info',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  BLOCKED: 'danger',
  DECEASED: 'neutral',
  CLOSED: 'neutral',
};

export const KYC_LABEL: Record<KycStatus, string> = {
  NOT_STARTED: 'KYC not started',
  IN_PROGRESS: 'KYC in progress',
  PENDING_VERIFICATION: 'KYC awaiting verification',
  VERIFIED: 'KYC verified',
  REVIEW_DUE: 'KYC review due',
  REJECTED: 'KYC rejected',
};

export const KYC_TONE: Record<KycStatus, StatusTone> = {
  NOT_STARTED: 'neutral',
  IN_PROGRESS: 'info',
  PENDING_VERIFICATION: 'warning',
  VERIFIED: 'success',
  REVIEW_DUE: 'warning',
  REJECTED: 'danger',
};

/**
 * The KYC moves the screen offers, mirroring the backend's transition table (`KYC_TRANSITIONS`):
 * `manage` moves are for clients.kyc.manage, `verify` moves for clients.kyc.verify. Offering one is
 * a convenience: the server refuses any move it does not allow, and the customer's creator may
 * never verify (KYC_SELF_VERIFICATION).
 */
export interface KycMove {
  to: KycStatus;
  label: string;
  needs: 'manage' | 'verify';
  /** Rejecting needs a reason (REASON_REQUIRED). */
  reason?: boolean;
}

export const KYC_MOVES: Record<KycStatus, KycMove[]> = {
  NOT_STARTED: [{ to: 'IN_PROGRESS', label: 'Start KYC', needs: 'manage' }],
  IN_PROGRESS: [{ to: 'PENDING_VERIFICATION', label: 'Send for verification', needs: 'manage' }],
  PENDING_VERIFICATION: [
    { to: 'VERIFIED', label: 'Verify KYC', needs: 'verify' },
    { to: 'REJECTED', label: 'Reject KYC', needs: 'verify', reason: true },
    { to: 'IN_PROGRESS', label: 'Back to in progress', needs: 'manage' },
  ],
  VERIFIED: [{ to: 'REVIEW_DUE', label: 'Mark review due', needs: 'manage' }],
  REVIEW_DUE: [
    { to: 'IN_PROGRESS', label: 'Reopen KYC', needs: 'manage' },
    { to: 'PENDING_VERIFICATION', label: 'Send for verification', needs: 'manage' },
    { to: 'VERIFIED', label: 'Verify KYC', needs: 'verify' },
  ],
  REJECTED: [{ to: 'IN_PROGRESS', label: 'Restart KYC', needs: 'manage' }],
};

/** Identifier types (C1 scope); the server validates and normalizes the value. */
export const IDENTIFIER_TYPES: { id: string; label: string; for: CustomerType[] }[] = [
  { id: 'NATIONAL_ID', label: 'National ID', for: ['INDIVIDUAL'] },
  { id: 'PASSPORT', label: 'Passport', for: ['INDIVIDUAL'] },
  { id: 'ALIEN_ID', label: 'Alien ID', for: ['INDIVIDUAL'] },
  { id: 'KRA_PIN', label: 'KRA PIN', for: ['INDIVIDUAL', 'CORPORATE', 'GROUP'] },
  { id: 'CERTIFICATE_OF_INCORPORATION', label: 'Certificate of incorporation', for: ['CORPORATE'] },
  { id: 'CR12_REFERENCE', label: 'CR12 reference', for: ['CORPORATE'] },
  { id: 'SACCO_MEMBER_NO', label: 'SACCO member number', for: ['INDIVIDUAL', 'GROUP'] },
  { id: 'OTHER', label: 'Other', for: ['INDIVIDUAL', 'CORPORATE', 'GROUP'] },
];

export const identifierLabel = (type: string) => IDENTIFIER_TYPES.find((item) => item.id === type)?.label ?? type;
