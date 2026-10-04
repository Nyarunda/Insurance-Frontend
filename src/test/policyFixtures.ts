/** Policy fixtures shaped like the backend's responses (FI1-C, FI1-D tests). */

import type { Me } from '../lib/auth/me';
import type { PolicyDetail, PolicySummary, PolicyVersion } from '../backend/policies/types';

export const POLICY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const ENDORSEMENT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const POLICY_ETAG = `"policy-${POLICY_ID}-v3"`;

export const MAKER: Me = {
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'maker@acme.test' },
  tenant: { id: '66666666-6666-4666-8666-666666666666', name: 'Acme Insurance' },
  permissions: ['policies.policy.view'],
  branches: [{ id: '77777777-7777-4777-8777-777777777777', code: 'NBO', name: 'Nairobi', scope: 'OWN' }],
};

export const summary = (over: Partial<PolicySummary> = {}): PolicySummary => ({
  id: POLICY_ID,
  policy_no: 'POL0000001',
  insurer_policy_no: '',
  lifecycle_status: 'BOUND',
  coverage_status: 'ACTIVE',
  customer: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', customer_no: 'CUS0000001', display_name: 'Wanjiku Holdings' },
  product: { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', code: 'MOTOR_PVT', name: 'Private Motor' },
  insurer: { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', code: 'JUB', name: 'Jubilee Insurance' },
  branch: { id: MAKER.branches[0].id, code: 'NBO', name: 'Nairobi' },
  inception_date: '2026-01-01',
  expiry_date: '2026-12-31',
  version_no: 2,
  currency: 'KES',
  total_premium: '52000.00',
  ...over,
});

export const version = (over: Partial<PolicyVersion> = {}): PolicyVersion => ({
  version_no: 2,
  source_type: 'ENDORSEMENT',
  endorsement_id: ENDORSEMENT_ID,
  effective_from: '2026-06-01',
  effective_to: null,
  inception_date: '2026-01-01',
  expiry_date: '2026-12-31',
  terminated: false,
  annual_premium: {
    currency: 'KES',
    basic_premium: '50000.00',
    levies_total: '2000.00',
    total_premium: '52000.00',
    levies: [
      { code: 'TL', name: 'Training levy', basis: 'PERCENT', rate: '0.2000', amount: '100.00' },
      { code: 'STAMP', name: 'Stamp duty', basis: 'FIXED', rate: '40.00', amount: '40.00' },
    ],
    rating_date: '2026-01-01',
  },
  risk: {
    factors: { sum_insured: '2500000.00', vehicle_use: 'PRIVATE_USE', rate_table_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' },
    details: { make: 'Toyota', model: 'Prado', owner_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' },
    identifiers: [{ identifier_type: 'REGISTRATION_NUMBER', value: 'KDA 123A' }],
    items: [{ code: 'TRAILER', description: 'Box trailer', identifier: 'ZD 4411', value: '150000.00' }],
  },
  cover: {
    cover_sections: [{ code: 'OWN_DAMAGE', name: 'Own damage', description: '', is_mandatory: true }],
    benefits: [
      {
        code: 'WINDSCREEN',
        name: 'Windscreen cover',
        section: 'OWN_DAMAGE',
        description: 'Repair or replacement',
        limit_amount: '75000.00',
        limit_description: 'Per occurrence',
        is_optional: false,
      },
      {
        code: 'COURTESY_CAR',
        name: 'Courtesy car',
        section: 'OWN_DAMAGE',
        description: '',
        limit_amount: null,
        limit_description: '',
        is_optional: true,
      },
    ],
    exclusions: [{ code: 'RACING', section: null, text: 'Racing, pace-making or speed testing' }],
  },
  terms: { geographical_limit: 'Kenya, Uganda and Tanzania' },
  sum_insured: '2500000.00',
  underwriting_details: { excess_note: 'Standard excess applies', approver_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' },
  created_at: '2026-05-20T08:00:00Z',
  ...over,
});

export const V1 = version({ version_no: 1, source_type: 'BIND', endorsement_id: null, effective_from: '2026-01-01', effective_to: '2026-05-31' });

export const detail = (over: Partial<PolicyDetail> = {}): PolicyDetail => ({
  ...summary(),
  source: {
    quotation: { id: '12121212-1212-4121-8121-121212121212', quotation_no: 'QUO0000007' },
    proposal: { id: '13131313-1313-4131-8131-131313131313', proposal_no: 'PRP0000004' },
  },
  agreement: { id: '14141414-1414-4141-8141-141414141414', agreement_type: 'BINDER', reference_no: 'BND-2026-01' },
  sum_insured: '2500000.00',
  bound_at: '2025-12-20T10:00:00Z',
  current_version: version(),
  cancellation: null,
  row_version: 3,
  ...over,
});
