export const notificationsResult = {
  results: [
    {
      id: 'n1', event: 'approved', occurred_at: '2026-10-10T09:00:00Z',
      workflow_instance_id: 'wi1', definition_name: 'Endorsement approval',
      resource_type: 'ENDORSEMENT', resource_reference: 'END0000042',
      reason_code: null, reason_label: null, reason_text: null, unread: true,
    },
    {
      id: 'n2', event: 'rejected', occurred_at: '2026-10-09T15:30:00Z',
      workflow_instance_id: 'wi2', definition_name: 'Proposal approval',
      resource_type: 'PROPOSAL', resource_reference: 'UWP0000003',
      reason_code: 'HIGH_RISK', reason_label: 'High risk', reason_text: 'Loss ratio exceeds threshold',
      unread: false,
    },
  ],
  unread_count: 1,
  seen_until: '2026-10-09T16:00:00Z',
};

export const productsResult = {
  results: [
    {
      id: 'p1', code: 'MOT-COMP', name: 'Motor Comprehensive', description: 'Full motor cover',
      insurer: { id: 'i1', code: 'APA', name: 'APA Insurance' },
      insurance_class: { id: 'c1', code: 'MOT', line: 'Motor' },
      currency: 'KES', status: 'ACTIVE', row_version: 1,
    },
    {
      id: 'p2', code: 'MOT-TPO', name: 'Motor Third Party Only', description: 'TPO cover',
      insurer: { id: 'i1', code: 'APA', name: 'APA Insurance' },
      insurance_class: { id: 'c1', code: 'MOT', line: 'Motor' },
      currency: 'KES', status: 'DRAFT', row_version: 1,
    },
  ],
};

export const workflowDefinitionsResult = {
  results: [
    {
      definition_code: 'ENDORSEMENT_APPROVAL', name: 'Endorsement approval',
      resource_type: 'ENDORSEMENT', installed: true, governed: true,
      active_version_no: 1, latest_version_no: 1,
      checker_role: 'CHECKER', checker_role_id: 'r1',
      ready: true, eligible_holders: 2, gaps: [],
      stages: [{ stage_no: 1, name: 'Review', branches: [{ branch_name: 'HQ', eligible_holders: 2 }] }],
    },
    {
      definition_code: 'PROPOSAL_APPROVAL', name: 'Proposal approval',
      resource_type: 'PROPOSAL', installed: true, governed: false,
      active_version_no: null, latest_version_no: 1,
      checker_role: 'UNDERWRITER', checker_role_id: 'r2',
      ready: false, eligible_holders: 0, gaps: ['No checker assigned in branch Mombasa'],
      stages: [],
    },
  ],
};
