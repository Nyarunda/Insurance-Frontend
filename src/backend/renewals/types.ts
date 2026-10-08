/** Renewal shapes as the backend returns them (RENEWALS-1; `apps/policies/renewals.py`). */

import type { WorkflowBlock } from '../endorsements/types';

export type RenewalStatus = 'DRAFT' | 'PRICED' | 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'RENEWED' | 'CANCELLED';
/** The stored status, or EXPIRED for an offer past its validity that the customer never answered. */
export type RenewalEffectiveStatus = RenewalStatus | 'EXPIRED';

export interface RenewalSummary {
  id: string;
  renewal_no: string;
  renewal_type: 'AS_IS' | 'AMENDED';
  status: RenewalStatus;
  effective_status: RenewalEffectiveStatus;
  inception_date: string;
  expiry_date: string;
  renewal_total_premium: string | null;
}

export interface RenewalList {
  policy_no: string;
  results: RenewalSummary[];
}

/** Annual figures; commission only when the server includes it (products.commission.view). */
export interface AnnualFigures {
  basic_premium: string;
  levies_total: string;
  total_premium: string;
  commission?: string;
  commission_rate_id?: string | null;
}

export interface RenewalPricing {
  version_no: number;
  rating_date: string;
  currency: string;
  expiring_annual: AnnualFigures;
  renewal_annual: AnnualFigures;
  premium_difference: string;
  movement_percent: string | null;
  priced_at: string;
}

export interface RenewalDetail extends RenewalSummary {
  policy: { id: string; policy_no: string };
  source_version_no: number;
  pricing: RenewalPricing | null;
  check: { required: boolean; reasons: string[]; approved_by: string | null; approved_at: string | null };
  offer_valid_until: string | null;
  offered_at: string | null;
  decision_reason: string;
  decided_at: string | null;
  resulting_version_no: number | null;
  renewed_at: string | null;
  workflow: WorkflowBlock | null;
  row_version: number;
}

/** RS-A prepares AS_IS renewals only; amended renewals are RS-B. Empty dates take the server's defaults. */
export interface PrepareBody {
  renewal_type: 'AS_IS';
  inception_date?: string;
  expiry_date?: string;
}

export interface DatesBody {
  inception_date: string;
  expiry_date: string;
}
