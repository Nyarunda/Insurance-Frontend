/** Certificate wording (CS-A): statuses and the server's refusals in words, never as codes (CS-D4, CS-D5). */

import type { StatusTone } from '../../components/horizon';
import { ApiError } from '../../lib/api/errors';
import { formatDate } from '../policies/format';
import type { Certificate, CertificateStatus } from './types';

export const CERTIFICATE_STATUS_LABEL: Record<CertificateStatus, string> = {
  AVAILABLE: 'Available stock',
  ISSUED: 'Issued',
  PRINTED: 'Printed',
  CANCELLED: 'Cancelled',
  SPOILT: 'Spoilt',
};

export const CERTIFICATE_TONE: Record<CertificateStatus, StatusTone> = {
  AVAILABLE: 'neutral',
  ISSUED: 'info',
  PRINTED: 'success',
  CANCELLED: 'danger',
  SPOILT: 'warning',
};

/** A live certificate certifies cover (the backend's LIVE). */
export const isLive = (c: Pick<Certificate, 'status'>) => c.status === 'ISSUED' || c.status === 'PRINTED';

/** What the certificate certifies, in one line: the vehicle, or the shipment. */
export function subjectText(c: Pick<Certificate, 'vehicle' | 'marine_details'>): string {
  if (c.marine_details) {
    const m = c.marine_details;
    return `${m.shipment_reference} · ${m.voyage_from} to ${m.voyage_to}`;
  }
  if (c.vehicle) return c.vehicle.registration || c.vehicle.chassis_number || '—';
  return '—';
}

export const periodText = (c: Pick<Certificate, 'effective_from' | 'effective_to'>) =>
  c.effective_from ? `${formatDate(c.effective_from)} – ${formatDate(c.effective_to)}` : '—';

const serialIn = (error: ApiError) => (typeof error.details.serial_no === 'string' ? error.details.serial_no : null);

/**
 * The refusals at issue and print, in words (CS-D4, CS-D5). Each names what to do next. A refusal
 * not listed falls back to the server's own message (ApiErrorAlert).
 */
export const CERTIFICATE_REFUSALS: Record<string, (error: ApiError) => string> = {
  CERTIFICATE_BACKDATED: () => 'A certificate cannot start before today. Choose today or a later date.',
  CERTIFICATE_NO_COVER: () => 'The policy does not cover that start date, so no certificate can be issued for it.',
  CERTIFICATE_BEYOND_COVER: (error) =>
    typeof error.details.covered_through === 'string'
      ? `The policy covers continuously only to ${formatDate(error.details.covered_through)}. End the certificate on or before that date, or leave the end empty.`
      : 'The certificate would run past the cover. Leave the end empty to use the end of continuous cover.',
  CERTIFICATE_PERIOD_INVALID: () => 'The certificate must end on or after the day it starts.',
  CERTIFICATE_TYPE_NOT_APPLICABLE: () => "That certificate type is for another class of insurance than this policy's.",
  CERTIFICATE_TYPE_UNKNOWN: () => 'That certificate type is not available any more. Choose another.',
  CERTIFICATE_VEHICLE_AMBIGUOUS: () => 'The policy names several vehicles. Choose the vehicle to certify.',
  CERTIFICATE_VEHICLE_UNKNOWN: () => 'That registration is not one of the vehicles on the policy.',
  CERTIFICATE_SUBJECT_MISSING: () => 'The policy names no vehicle registration or chassis number to certify.',
  CERTIFICATE_SUBJECT_INVALID: () => 'Fill in every shipment detail: reference, conveyance, voyage from and to, and the goods.',
  CERTIFICATE_VEHICLE_ALREADY_CERTIFIED: (error) =>
    `Certificate ${serialIn(error) ?? 'another certificate'} already certifies this vehicle for those dates. Replace it instead of issuing a second one.`,
  CERTIFICATE_VEHICLE_IDENTITY_CONFLICT: (error) =>
    `Certificate ${serialIn(error) ?? 'another certificate'} shares one identifier with this vehicle but contradicts the other (registration or chassis). Resolve the vehicle's identity first.`,
  CERTIFICATE_SHIPMENT_ALREADY_CERTIFIED: (error) =>
    `Certificate ${serialIn(error) ?? 'another certificate'} already certifies this shipment. Replace it instead of issuing a second one.`,
  CERTIFICATE_STOCK_UNAVAILABLE: () =>
    'No certificates are held for this insurer and type, by you or your branch. Ask your stock manager.',
  CERTIFICATE_STOCK_NOT_HELD: () => 'That serial is held by someone else. Leave the serial empty to use stock you may issue.',
  CERTIFICATE_REPLACEMENT_INVALID: () =>
    'Only a live certificate of the same type, for the same vehicle or shipment, can be replaced.',
  CERTIFICATE_POLICY_TERMS_CHANGED: (error) => {
    const named = error.details.version_no;
    const now = error.details.current_version_no;
    const versions = typeof named === 'number' && typeof now === 'number' ? ` It names version ${named}; version ${now} is now in force for its start date.` : '';
    return `The policy's terms changed after this certificate was issued, so it cannot be printed.${versions} Replace it with a certificate for the current terms.`;
  },
  CERTIFICATE_COVER_CHANGED: (error) =>
    `The policy no longer covers this certificate's whole validity${
      typeof error.details.covered_through === 'string' ? ` (covered through ${formatDate(error.details.covered_through)})` : ''
    }, so it cannot be printed. Cancel it or replace it.`,
  CERTIFICATE_STATE_INVALID: () => 'The certificate has moved on since you opened it. It has been reloaded.',
  CERTIFICATE_CANCELLATION_PENDING: () => 'A cancellation of this certificate is already waiting for approval.',
};

/** Refusals after which Replace is the way on (CS-D4, CS-D5). */
export const REPLACE_OFFERED = new Set([
  'CERTIFICATE_VEHICLE_ALREADY_CERTIFIED',
  'CERTIFICATE_SHIPMENT_ALREADY_CERTIFIED',
  'CERTIFICATE_POLICY_TERMS_CHANGED',
  'CERTIFICATE_COVER_CHANGED',
]);

export const refusalText = (error: unknown): string | null =>
  error instanceof ApiError && CERTIFICATE_REFUSALS[error.code] ? CERTIFICATE_REFUSALS[error.code](error) : null;
