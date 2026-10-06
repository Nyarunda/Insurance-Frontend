/** Quotation words and colours. The server owns every rule; these only label its answers. */

import type { StatusTone } from '../../components/horizon';
import type { EffectiveStatus } from './types';

export const QUOTATION_STATUS_LABEL: Record<EffectiveStatus, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Offer issued',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Offer expired',
};

export const QUOTATION_TONE: Record<EffectiveStatus, StatusTone> = {
  DRAFT: 'info',
  ISSUED: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'danger',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
};

/** The platform's fixed risk identifier types (NB-D3): quotation fields, not product setup. */
export const RISK_IDENTIFIER_TYPES: { id: string; label: string }[] = [
  { id: 'VEHICLE_REGISTRATION', label: 'Vehicle registration' },
  { id: 'CHASSIS_NUMBER', label: 'Chassis number' },
  { id: 'ENGINE_NUMBER', label: 'Engine number' },
  { id: 'PROPERTY_REFERENCE', label: 'Property / land reference' },
  { id: 'VESSEL_NUMBER', label: 'Vessel number' },
  { id: 'OTHER', label: 'Other' },
];

export const riskIdentifierLabel = (type: string) => RISK_IDENTIFIER_TYPES.find((item) => item.id === type)?.label ?? type;
