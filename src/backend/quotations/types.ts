/** Quotation and product shapes as the backend returns them (QUOTATIONS-1, INSURANCE-SETUP-1). */

import type { ReferenceField, ReferenceSnapshot } from '../reference/vehicles';

export type QuotationStatus = 'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
/** The stored status, or EXPIRED for an issued offer past its validity (derived by the server). */
export type EffectiveStatus = QuotationStatus | 'EXPIRED';

interface Ref {
  id: string;
  code: string;
  name: string;
}

export interface QuotationSummary {
  id: string;
  quotation_no: string;
  status: QuotationStatus;
  effective_status: EffectiveStatus;
  customer: { id: string; customer_no: string; display_name: string };
  product: Ref;
  insurer: Ref;
  branch: Ref;
  quote_date: string;
  valid_until: string;
  current_revision_no: number;
}

export interface QuotationPage {
  results: QuotationSummary[];
  count: number;
  page: number;
  page_size: number;
}

export interface RiskIdentifier {
  identifier_type: string;
  value: string;
}

export interface Risk {
  factors: Record<string, string | number | boolean>;
  /** Free text, or for a version's reference fields (SD-B) the code and name stored at the time. */
  details: Record<string, string | ReferenceSnapshot>;
  identifiers: RiskIdentifier[];
}

export interface Levy {
  code: string;
  name: string;
  amount: string;
  [key: string]: unknown;
}

export interface Pricing {
  priced_at: string;
  rating_date: string;
  version_no: number;
  currency: string;
  base_premium: string;
  loadings: string;
  discounts: string;
  minimum_premium_adjustment: string;
  rounding_adjustment: string;
  basic_premium: string;
  levies: Levy[];
  levies_total: string;
  total_premium: string;
  /** Present only for a caller holding products.commission.view (Q1-D8). */
  commission?: { amount: string; rate_percent?: string; [key: string]: unknown } | null;
}

export interface DuplicateAlerts {
  visible: { id: string; quotation_no: string; status: string }[];
  hidden_count: number;
}

export interface RevisionView {
  revision_no: number;
  status: 'DRAFT' | 'ISSUED';
  risk: Risk;
  pricing: Pricing | null;
  required_documents: { code: string; name: string; stage: string; is_mandatory: boolean }[];
  duplicate_alerts: DuplicateAlerts;
  duplicates_acknowledged: boolean;
  duplicate_reason: string;
  workflow: {
    instance_id: string;
    status: string;
    stage_label?: string | null;
    waiting_on?: string[];
  } | null;
  check: { required: boolean; status: 'NONE' | 'PENDING' | 'APPROVED'; submitted_at: string | null; checked_at: string | null };
  issued_at: string | null;
}

export interface QuotationDetail extends QuotationSummary {
  marketer_ref: string;
  agent_ref: string;
  sub_agent_ref: string;
  decision_reason: string;
  decided_at: string | null;
  row_version: number;
  current_revision: RevisionView;
  revisions: { revision_no: number; status: string; issued_at: string | null; total_premium: string | null }[];
}

/** The offer as issued (frozen names, risk, pricing and documents). */
export interface Offer {
  quotation_no: string;
  quote_date: string;
  valid_until: string;
  customer: { customer_no: string; display_name: string };
  insurer: { name: string };
  product: { name: string };
  branch: { name: string };
  revision_no: number;
  risk: Risk;
  pricing: Pricing | null;
  required_documents: RevisionView['required_documents'];
  issued_at: string | null;
}

export interface ProductSummary {
  id: string;
  code: string;
  name: string;
  insurer: { id: string; code: string; name: string };
  currency: string;
  status: 'ACTIVE' | 'WITHDRAWN';
}

export interface ProductVersionSummary {
  id: string;
  version_no: number;
  status: 'DRAFT' | 'PUBLISHED';
  effective_from: string | null;
  effective_to: string | null;
}

export interface RatingFactor {
  code: string;
  name: string;
  data_type: 'DECIMAL' | 'CHOICE' | 'BOOLEAN';
  choices: string[];
  min_value: string | null;
  max_value: string | null;
  is_required: boolean;
  unit: string;
}

export interface ProductVersionDocument extends ProductVersionSummary {
  /** `reference_fields` only when the version declares some (SD-B); otherwise details are free text. */
  content: { rating_factors: RatingFactor[]; reference_fields?: ReferenceField[] };
}
