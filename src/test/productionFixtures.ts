export const productionOptions = {
  branches: [{ id: 'branch', name: 'Nairobi' }], products: [{ id: 'motor', name: 'Commercial motor' }],
  insurers: [{ id: 'insurer', name: 'Horizon Underwriters' }],
  agents: [{ id: 'agent', name: 'Karibu Agency' }], sub_agents: [{ id: 'sub-agent', name: 'Karibu Sub-agent' }],
};
const premium = { currency: 'KES', basic_premium: '45000.00', levies_total: '250.30', total_premium: '45250.30' };
export const productionReport = {
  date_from: '2026-10-01', date_to: '2026-10-31', timezone: 'Africa/Nairobi', date_basis: 'BINDING_DATE',
  premium_basis: 'ORIGINAL_BOUND', group_by: 'product', view: 'summary' as const, page: 1, page_size: 25, count: 26,
  totals: [{ ...premium, policy_count: 2 }, { currency: 'USD', policy_count: 1, basic_premium: '100.00', levies_total: '1.00', total_premium: '101.00' }],
  results: [{ ...premium, bucket: 'motor', label: 'Commercial motor', policy_count: 2, premium_share: '100.00' }],
};
export const productionPolicies = {
  ...productionReport, view: 'policies' as const, count: 1,
  results: [{ ...premium, id: 'policy', policy_no: 'POL0000021', bound_date: '2026-10-11', product: 'Commercial motor', insurer: 'Horizon Underwriters', branch: 'Nairobi' }],
};
