import { describe, expect, it } from 'vitest';
import { classifyCommandError } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { actorLabel, displayFacts, formatMoney, humanize, isUuid } from './format';
import type { HistoryEntry } from './types';

const entry = (over: Partial<HistoryEntry>): HistoryEntry => ({
  action: 'APPROVE',
  actor_kind: 'USER',
  actor_user_id: '6f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
  acting_for_user_id: null,
  new_status: 'APPROVED',
  stage: 'ENDORSEMENT_CHECK',
  reason_code: null,
  reason_text: '',
  occurred_at: '2026-10-04T10:00:00Z',
  ...over,
});

describe('display rules', () => {
  it('turns codes into words by one generic rule', () => {
    expect(humanize('POLICY_ENDORSEMENT_APPROVAL')).toBe('Policy endorsement approval');
    expect(humanize('PENDING_APPROVAL')).toBe('Pending approval');
    expect(humanize(null)).toBe('');
  });

  it('formats money, and says why an amount is missing', () => {
    expect(formatMoney('70000.00', 'KES')).toBe('KES 70,000.00');
    expect(formatMoney(null, 'USD', 'FX_NOT_AVAILABLE')).toBe('Not available in the base currency (USD)');
    expect(formatMoney(null, null)).toBe('—');
  });

  it('shows approval facts without identifiers, hashes or the internal action', () => {
    const rows = displayFacts({
      action: 'APPROVE_ENDORSEMENT',
      endorsement_no: 'END0000001',
      policy_id: '6f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
      branch_id: '1b2c3d4e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
      terms_hash: 'ab'.repeat(32),
      endorsement_type: 'CHANGE_LIMIT',
      single_word_code: 'ACTIVE',
      premium_delta: '0.00',
      some_reference: '2c3d4e5f-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
      nested: { a: 1 },
    });
    expect(rows).toEqual([
      { label: 'Endorsement no', value: 'END0000001' },
      { label: 'Endorsement type', value: 'Change limit' },
      { label: 'Single word code', value: 'ACTIVE' },
      { label: 'Premium delta', value: '0.00' },
    ]);
    expect(rows.some((row) => isUuid(row.value))).toBe(false);
  });

  it('names people only as You, System, or by the stage they acted at', () => {
    const me = '6f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f';
    expect(actorLabel(entry({}), me)).toBe('You');
    expect(actorLabel(entry({ actor_kind: 'SYSTEM', actor_user_id: null }), me)).toBe('System');
    expect(actorLabel(entry({ actor_user_id: '9a9a9a9a-1d2a-4c3b-9e8f-0a1b2c3d4e5f' }), me)).toBe('Endorsement check approver');
    expect(actorLabel(entry({ actor_user_id: '9a9a9a9a-1d2a-4c3b-9e8f-0a1b2c3d4e5f', stage: null, action: 'SUBMIT' }), me)).toBe(
      'Requester',
    );
  });
});

const err = (status: number, code: string) => new ApiError({ status, code, message: code, correlationId: 'c', details: {} });

describe('the §4 error contract', () => {
  it.each([
    [err(412, 'CONCURRENCY_CONFLICT'), 'stale'],
    [err(409, 'WORKFLOW_STEP_NOT_CURRENT'), 'changed'],
    [err(409, 'INVALID_STATE_TRANSITION'), 'changed'],
    [err(409, 'ENDORSEMENT_BASE_STALE'), 'business'],
    [err(409, 'WORKFLOW_APPROVAL_REQUIRED'), 'business'],
    [err(403, 'SOD_MAKER_CANNOT_APPROVE'), 'refused'],
    [err(403, 'WORKFLOW_NOT_ASSIGNED'), 'refused'],
    [err(404, 'WORKFLOW_INSTANCE_NOT_FOUND'), 'notFound'],
    [err(422, 'WORKFLOW_REASON_REQUIRED'), 'invalid'],
    [err(422, 'VALIDATION_FAILED'), 'invalid'],
    [err(422, 'IDEMPOTENCY_KEY_REUSED'), 'defect'],
    [err(428, 'MISSING_IF_MATCH'), 'defect'],
    [err(0, 'NETWORK_ERROR'), 'network'],
    [err(500, 'INTERNAL_ERROR'), 'other'],
  ])('%#: %s', (error, kind) => {
    expect(classifyCommandError(error)).toBe(kind);
  });
});
