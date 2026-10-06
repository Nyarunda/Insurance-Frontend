/** Underwriting proposal shapes as the backend returns them (UNDERWRITING-1). */

import type { Levy, Risk } from '../quotations/types';

export type ProposalStatus = 'DRAFT' | 'UNDER_REVIEW' | 'REFERRED' | 'READY_TO_BIND' | 'BOUND' | 'DECLINED' | 'CANCELLED';

interface Ref {
  id: string;
  code: string;
  name: string;
}

export interface ProposalSummary {
  id: string;
  proposal_no: string;
  status: ProposalStatus;
  quotation: { id: string; quotation_no: string };
  customer: { id: string; customer_no: string; display_name: string };
  product: Ref;
  insurer: Ref;
  branch: Ref;
  proposed_inception_date: string | null;
  proposed_expiry_date: string | null;
  currency: string;
  total_premium: string;
}

export interface ProposalPage {
  results: ProposalSummary[];
  count: number;
  page: number;
  page_size: number;
}

/** The accepted offer's premium, copied once at creation and never recalculated (U1-D5). */
export interface ProposalPremium {
  currency: string;
  revision_no: number;
  rating_date: string | null;
  version_no: number;
  base_premium: string;
  loadings: string;
  discounts: string;
  minimum_premium_adjustment: string;
  rounding_adjustment: string;
  basic_premium: string;
  levies: Levy[];
  levies_total: string;
  total_premium: string;
  /** Present only for a caller holding products.commission.view. */
  commission?: { amount: string; rate_percent?: string; [key: string]: unknown } | null;
  [key: string]: unknown;
}

export interface Requirement {
  code: string;
  name: string;
  source: 'PRODUCT' | 'UNDERWRITER';
  stage: string;
  required: boolean;
  satisfied: boolean;
  evidence_reference: string;
  satisfied_by: string | null;
  satisfied_at: string | null;
}

export interface ProposalException {
  id: string;
  code: string;
  source: 'SYSTEM' | 'UNDERWRITER';
  reason: string;
  details: Record<string, unknown>;
  status: 'OPEN' | 'APPROVED' | 'SUPERSEDED';
  raised_by: string | null;
  raised_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approval_note: string;
  /** The latest workflow approval of this exception, when the tenant governs it. */
  workflow: {
    instance_id: string;
    status: string;
    stage_label?: string | null;
    waiting_on?: string[];
  } | null;
}

/** What still keeps a submitted proposal from READY_TO_BIND, as the server judges it. */
export interface Blocker {
  code: 'EXCEPTION_OPEN' | 'REQUIREMENT_OUTSTANDING' | 'CUSTOMER_KYC_NOT_VERIFIED' | string;
  message: string;
  item: string;
}

export interface Cover {
  cover_sections: { code: string; name: string; description?: string; is_mandatory?: boolean }[];
  benefits: { code: string; name: string; section: string | null; limit_amount: string | null; limit_description?: string; is_optional?: boolean }[];
  exclusions: { code: string; section: string | null; text: string }[];
}

export interface ProposalDetail extends ProposalSummary {
  quotation_revision_no: number;
  product_version_id: string;
  quote_valid_until: string;
  agreement: { id: string; agreement_type: string; reference_no: string } | null;
  sum_insured: string | null;
  underwriting_details: Record<string, string>;
  premium: ProposalPremium;
  quoted_risk: Risk;
  cover: Cover;
  requirements: Requirement[];
  exceptions: ProposalException[];
  blockers: Blocker[];
  submitted_at: string | null;
  ready_at: string | null;
  policy_no: string | null;
  bound_at: string | null;
  decision_reason: string;
  decided_at: string | null;
  row_version: number;
}

/** An insurer agreement the business can be placed under (`GET /insurers/{id}/agreements`). */
export interface Agreement {
  id: string;
  agreement_type: string;
  reference_no: string;
  effective_from: string | null;
  effective_to: string | null;
  status: string;
  binder_limit: string | null;
}
