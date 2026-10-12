export const diaryReport = {
  date_from: '2026-10-01', date_to: '2026-12-31', as_of: '2026-10-11', date_basis: 'LATEST_VERSION_EXPIRY',
  count: 26, page: 1, page_size: 25,
  totals: [{ currency: 'KES', policy_count: 26, in_progress: 8, expired_count: 3, expiring_premium: '450250.30' }],
  results: [{ id: 'policy', policy_no: 'POL0000021', customer: 'ABC Logistics Ltd', product: 'Commercial motor',
    insurer: 'Horizon Underwriters', branch: 'Nairobi', expiry_date: '2026-10-15', days_to_expiry: 4,
    currency: 'KES', expiring_premium: '45250.30', renewal_id: 'renewal', renewal_no: 'REN0000007', renewal_status: 'EXPIRED', renewal_stale: true }],
};
