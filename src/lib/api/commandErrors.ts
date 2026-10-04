/**
 * How a screen reacts to a refused command: the concurrency and error contract of the FI1 scope (§4).
 *
 * | kind        | responses                                        | the screen                                  |
 * | stale       | 412 CONCURRENCY_CONFLICT                         | reload, keep what was typed, resubmit with  |
 * |             |                                                  | the new ETag (same key if unchanged)        |
 * | changed     | 409 WORKFLOW_STEP_NOT_CURRENT, other state       | "This item changed…", reload                |
 * |             | conflicts                                        |                                             |
 * | business    | 409 with a `required_action`, or a business code | the message and the required action         |
 * | refused     | 403                                              | the server's message, no retry, reload      |
 * | notFound    | 404                                              | "Not found or not available to you"         |
 * | invalid     | 422 VALIDATION_FAILED, WORKFLOW_REASON_REQUIRED  | errors on the fields                        |
 * | defect      | 422 IDEMPOTENCY_KEY_REUSED, 428                  | a client defect, with its reference         |
 * | network     | no response                                      | retry with the same key and body            |
 * | other       | anything else                                    | the message, with its reference             |
 */

import { ApiError } from './errors';

export type CommandErrorKind =
  | 'stale'
  | 'changed'
  | 'business'
  | 'refused'
  | 'notFound'
  | 'invalid'
  | 'defect'
  | 'network'
  | 'other';

/** 409 codes that mean "someone else acted or it is no longer pending", not a business rule. */
const STATE_CONFLICTS = new Set(['WORKFLOW_STEP_NOT_CURRENT', 'INVALID_STATE_TRANSITION']);

export function classifyCommandError(error: unknown): CommandErrorKind {
  if (!(error instanceof ApiError)) return 'other';
  if (error.isNetwork) return 'network';
  switch (error.status) {
    case 412:
      return 'stale';
    case 409:
      if (STATE_CONFLICTS.has(error.code)) return 'changed';
      return 'business';
    case 403:
      return 'refused';
    case 404:
      return 'notFound';
    case 422:
      return error.code === 'IDEMPOTENCY_KEY_REUSED' ? 'defect' : 'invalid';
    case 428:
      return 'defect';
    default:
      return 'other';
  }
}

export const CHANGED_TEXT = 'This item changed: someone else acted or it is no longer pending.';
export const STALE_TEXT = 'This record changed since you opened it. It has been reloaded; check it and confirm again.';
export const NOT_FOUND_TEXT = 'Not found or not available to you.';
