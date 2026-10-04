/** Policy shapes as the backend returns them (`apps/policies`, FI1-C). Decimals arrive as strings. */

export type LifecycleStatus = 'BOUND' | 'CANCELLED';
export type CoverageStatus = 'PENDING_INCEPTION' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface Party {
  id: string;
  code: string;
  name: string;
}

export interface PolicySummary {
  id: string;
  policy_no: string;
  insurer_policy_no: string;
  lifecycle_status: LifecycleStatus;
  coverage_status: CoverageStatus;
  customer: { id: string; customer_no: string; display_name: string };
  product: Party;
  insurer: Party;
  branch: Party;
  inception_date: string;
  expiry_date: string;
  version_no: number;
  currency: string;
  total_premium: string;
}

export interface PolicyPage {
  results: PolicySummary[];
  count: number;
  page: number;
  page_size: number;
}

export interface Levy {
  code: string;
  name: string;
  basis: string;
  rate: string;
  amount: string;
}

export interface VersionPremium {
  currency: string;
  basic_premium: string;
  levies_total: string;
  total_premium: string;
  levies: Levy[];
  rating_date: string;
  /** Present only for users who may see commission. */
  commission?: string;
}

export interface Benefit {
  code: string;
  name: string;
  section: string | null;
  description: string;
  limit_amount: string | null;
  limit_description: string;
  is_optional: boolean;
}

export interface Cover {
  cover_sections: { code: string; name: string; description: string; is_mandatory: boolean }[];
  benefits: Benefit[];
  exclusions: { code: string; section: string | null; text: string }[];
}

export interface RiskItem {
  code: string;
  description: string;
  identifier?: string;
  value?: string;
}

export interface Risk {
  factors?: Record<string, unknown>;
  details?: Record<string, unknown>;
  identifiers?: { identifier_type: string; value: string }[];
  items?: RiskItem[];
}

export interface PolicyVersion {
  version_no: number;
  source_type: 'BIND' | 'ENDORSEMENT' | 'RENEWAL';
  endorsement_id: string | null;
  effective_from: string;
  effective_to: string | null;
  inception_date: string;
  expiry_date: string;
  terminated: boolean;
  annual_premium: VersionPremium;
  risk: Risk;
  cover: Cover;
  terms: Record<string, unknown>;
  sum_insured: string | null;
  underwriting_details: Record<string, unknown>;
  created_at: string;
}

export interface PolicyDetail extends PolicySummary {
  source: { quotation: { id: string; quotation_no: string }; proposal: { id: string; proposal_no: string } };
  agreement: { id: string; agreement_type: string; reference_no: string };
  sum_insured: string | null;
  bound_at: string;
  current_version: PolicyVersion;
  cancellation: { date: string; reason: string; cancelled_at: string } | null;
  row_version: number;
}

export interface VersionList {
  policy_no: string;
  results: PolicyVersion[];
}
