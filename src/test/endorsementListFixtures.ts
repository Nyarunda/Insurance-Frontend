export const endorsementListResult = {
  results: [
    {
      id: 'e1', endorsement_no: 'END0001', endorsement_type: 'PREMIUM_ADJUSTMENT',
      status: 'EFFECTIVE', effective_date: '2026-10-01', premium_delta: '500.00',
      levy_delta: '25.00', created_at: '2026-09-28T10:00:00Z',
      policy_id: 'p1', policy_no: 'POL0000001', customer_id: 'c1', customer_name: 'Acme Ltd',
    },
    {
      id: 'e2', endorsement_no: 'END0002', endorsement_type: 'CANCELLATION',
      status: 'DRAFT', effective_date: '2026-10-05', premium_delta: '-1000.00',
      levy_delta: '-50.00', created_at: '2026-10-02T14:30:00Z',
      policy_id: 'p2', policy_no: 'POL0000002', customer_id: 'c2', customer_name: 'Beta Corp',
    },
  ],
  count: 2, page: 1, page_size: 25,
};

export const emptyEndorsementList = { results: [], count: 0, page: 1, page_size: 25 };
