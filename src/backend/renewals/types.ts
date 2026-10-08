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
  /** The amendments as asked (AMENDED); empty for AS_IS. */
  requested_changes: RenewalChanges;
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

/** The controlled amendments the server accepts on an AMENDED renewal (R1-D4); only what changes is sent. */
export interface RenewalChanges {
  factors?: Record<string, string | boolean>;
  sum_insured?: string;
  add_benefits?: string[];
  remove_benefits?: string[];
  limits?: Record<string, string>;
  geographical_limit?: string;
}

/** As is (RS-A) or amended (RS-B). Empty dates take the server's defaults. */
export interface PrepareBody {
  renewal_type: 'AS_IS' | 'AMENDED';
  inception_date?: string;
  expiry_date?: string;
  changes?: RenewalChanges;
}

/** Change the amendments of a Draft or Priced renewal; it returns to draft. */
export interface AmendBody {
  renewal_type: 'AS_IS' | 'AMENDED';
  changes: RenewalChanges;
}

export interface DatesBody {
  inception_date: string;
  expiry_date: string;
}

/** A renewal in the cross-policy list (RS-C, `GET /renewals`): its summary and its policy. */
export interface RenewalListItem extends RenewalSummary {
  policy: { id: string; policy_no: string };
}

export interface RenewalPage {
  results: RenewalListItem[];
  count: number;
  page: number;
  page_size: number;
}
