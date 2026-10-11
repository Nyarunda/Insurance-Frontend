import { describe, expect, it } from 'vitest';
import { moduleLabel, permissionLabel } from './accessLabels';

describe('Access labels', () => {
  it.each([
    ['billing.receipt.create', 'Record receipts'],
    ['billing.receipt.reverse', 'Reverse receipts'],
    ['billing.document.view', 'View receipts and statements'],
    ['clients.document.view', 'View customer documents'],
    ['admin.roles.manage', 'Manage roles and permissions'],
    ['workflow.task.view_team', 'View team work items'],
    ['clients.document.restricted_download', 'Download restricted customer documents'],
    ['claims.payment.final_approve', 'Give final approval for claim payments'],
  ])('labels %s without changing the identifier', (code, label) => {
    expect(permissionLabel(code)).toBe(label);
  });
  it('keeps unknown identifiers readable', () => {
    expect(moduleLabel('new_module')).toBe('New module');
    expect(permissionLabel('new.customer_record.view')).toBe('View customer record');
    expect(permissionLabel('legacy_code')).toBe('Legacy code');
  });
});
