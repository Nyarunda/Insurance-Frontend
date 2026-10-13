export const ledgerOptions = { accounts: [{ id: 'bank', code: 'BANK-01', name: 'Operating bank', kind: 'BANK', currency: 'KES' }], branches: [{ id: 'branch', name: 'Nairobi' }] };
export const ledgerTotal = { currency: 'KES', opening: '10.00', debit: '123.45', credit: '0.00', closing_debit: '133.45', closing_credit: '0.00' };
export const ledgerReport = {
  view: 'journals', date_from: '2026-10-01', date_to: '2026-10-31', page: 1, page_size: 25, count: 26,
  totals: [ledgerTotal], results: [{ id: 'posting', posting_date: '2026-10-13', description: 'Premium receipt', branch: 'Nairobi', currency: 'KES', receipt_no: 'RCT00001', source_action: 'RECORD', debit: '123.45', credit: '123.45' }],
};
export const ledgerEntry = { id: 'line', posting_id: 'posting', posting_date: '2026-10-13', code: 'BANK-01', name: 'Operating bank', kind: 'BANK', branch: 'Nairobi', currency: 'KES', receipt_no: 'RCT00001', source_action: 'RECORD', debit: '123.45', credit: '0.00', running_balance: '133.45', memo: 'Premium receipt' };
export const journalDetail = {
  id: 'posting', posting_date: '2026-10-13', branch: 'Nairobi', currency: 'KES', description: 'Premium receipt', receipt_id: 'receipt', receipt_no: 'RCT00001', source_type: 'PREMIUM_RECEIPT', source_action: 'RECORD',
  lines: [{ line_no: 1, account_id: 'bank', code: 'BANK-01', name: 'Operating bank', debit: '123.45', credit: '0.00', memo: '' }, { line_no: 2, account_id: 'receivable', code: 'RECV-01', name: 'Client receivable', debit: '0.00', credit: '123.45', memo: '' }],
};
