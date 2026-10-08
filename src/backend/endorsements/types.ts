/** Endorsement shapes as the backend returns them (`apps/policies/endorsements.py`, FI1-D). */

import type { Cover, Risk } from '../policies/types';

export type EndorsementStatus = 'DRAFT' | 'REFERRED' | 'EFFECTIVE' | 'DECLINED' | 'CANCELLED';

export interface EndorsementSummary {
  id: string;
  endorsement_no: string;
  endorsement_type: string;
  status: EndorsementStatus;
  effective_date: string;
  premium_delta: string;
  levy_delta: string;
}

export interface EndorsementList {
  policy_no: string;
  results: EndorsementSummary[];
}

/** The latest workflow instance on the endorsement, if any (`integration.workflow_block`). */
export interface WorkflowBlock {
  instance_id: string;
  definition_code: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'VOID' | string;
  stage: string | null;
  lock_version: number;
  /** DESIGN-1 (backend approve-comment branch on): the stage's name, the path, and the roles it waits for. */
  stage_label?: string | null;
  path?: ApprovalPathStage[];
  waiting_on?: string[];
}

/** One stage of the frozen approval path, by name only. */
export interface ApprovalPathStage {
  code: string;
  name: string;
  state: 'DONE' | 'CURRENT' | 'NEXT' | 'REJECTED' | 'VOID' | 'NOT_REACHED' | string;
}

/** PTH1-D4: why a referred endorsement can no longer be approved, and what to do next. */
export interface Blocker {
  code: string;
  message: string;
  required_action?: string;
  [detail: string]: unknown;
}

export interface AnnualFigures {
  basic_premium: string;
  levies_total: string;
  total_premium: string;
  commission?: string;
}

export interface EndorsementDetail extends EndorsementSummary {
  policy: { id: string; policy_no: string };
  base_version_no: number;
  reason: string;
  requested_changes: Record<string, unknown>;
  resulting_terms: {
    risk: Risk;
    cover: Cover;
    terms: Record<string, unknown>;
    sum_insured: string | null;
    expiry_date: string;
    terminated: boolean;
  };
  rerated: boolean;
  old_annual: AnnualFigures;
  new_annual: AnnualFigures;
  financial: {
    currency: string;
    premium_delta: string;
    levy_delta: string;
    total_delta: string;
    commission_delta?: string;
  };
  requires_check: boolean;
  submitted_at: string | null;
  approved_at: string | null;
  decision_reason: string;
  decided_at: string | null;
  resulting_version_no: number | null;
  workflow: WorkflowBlock | null;
  blocker: Blocker | null;
  row_version: number;
}

/** A draft's edit (`PATCH /endorsements/{id}`): its date, reason and change, computed again by the server. */
/** The endorsement types the screens prepare. Adding or removing a risk item is refused by the server
 * (items cannot be priced yet), so it is never offered. */
export type EndorsementKind =
  | 'CHANGE_LIMIT'
  | 'CHANGE_SUM_INSURED'
  | 'CHANGE_COVER'
  | 'CHANGE_GEOGRAPHICAL_LIMIT'
  | 'CHANGE_POLICY_PERIOD'
  | 'CANCELLATION';

export interface EndorsementPatchBody {
  effective_date: string;
  reason: string;
  changes: Record<string, unknown>;
}

export interface EndorsementBody {
  endorsement_type: EndorsementKind;
  effective_date: string;
  reason: string;
  changes: Record<string, unknown>;
}

/** FI1-D's original body, kept as a name for the change-limit case. */
export type ChangeLimitBody = EndorsementBody;
