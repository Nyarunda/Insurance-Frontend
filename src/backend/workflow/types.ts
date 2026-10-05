/**
 * The workflow API's shapes as the backend sends them (backend `apps/workflow/views.py`, WI1-B).
 * Identifier fields are kept for requests and routing only; they are never rendered (FI1-Q6).
 */

export type Decision = 'APPROVE' | 'REJECT';

export interface Money {
  /** A decimal string, or null when the amount is not in the base currency and no rate exists. */
  amount: string | null;
  currency: string | null;
  /** `FX_NOT_AVAILABLE` when the amount is null for that reason. */
  amount_reason: string | null;
}

/** `GET /work-queue` result: one live approval task of the caller. */
export interface WorkQueueItem extends Money {
  assignment_id: string;
  workflow_instance_id: string;
  step_id: string;
  definition_code: string;
  resource_type: string;
  resource_id: string;
  resource_reference: string | null;
  stage: string;
  stage_label: string;
  slot_no: number | null;
  /** Set when the task is held for a delegator; delegation is not managed in FI1 (F-14). */
  acting_for_user_id: string | null;
  branch_id: string | null;
  assigned_at: string | null;
  /** The governed facts frozen at submission (RUP1-F1), as on the instance; absent on older backends. */
  approval_facts?: Record<string, unknown> | null;
}

export interface WorkQueue {
  results: WorkQueueItem[];
}

export interface Quorum {
  mode: string;
  required: number;
  counted: number;
  slots: number;
}

export interface HistoryEntry {
  action: string;
  actor_kind: string;
  actor_user_id: string | null;
  acting_for_user_id: string | null;
  new_status: string | null;
  stage: string | null;
  reason_code: string | null;
  reason_text: string;
  occurred_at: string | null;
}

/** `GET /workflows/instances/{id}`: the instance, with its strong ETag in the header (and body). */
export interface InstanceView extends Money {
  id: string;
  definition_code: string;
  version_no: number;
  resource: { type: string; id: string; reference: string | null };
  status: string;
  stage: string | null;
  stage_label: string | null;
  step_id: string | null;
  cycle_no: number;
  quorum: Quorum | null;
  approval_facts: Record<string, unknown> | null;
  branch_id: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  history: HistoryEntry[];
  etag: string;
}

export interface ReasonCode {
  code: string;
  label: string;
  requires_text: boolean;
}

export interface ActionBody {
  action: Decision;
  step_id: string;
  slot_no?: number;
  reason_code?: string;
  reason_text?: string;
}
