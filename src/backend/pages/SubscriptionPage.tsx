import React, { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Check, Pencil, X } from 'lucide-react';
import { usePermission } from '../../lib/auth/me';
import { SubscriptionInfo, useOperationsQuery } from '../operations/data';
import { ActionDialog, ActionSpec, QueryState, Refresh, Surface, Tabs } from '../operations/ui';
import { StatusBadge } from '../../components/horizon';

const MODULE_LABELS: Record<string, string> = {
  clients: 'Clients', insurers: 'Insurers', products: 'Products',
  quotations: 'Quotations', underwriting: 'Underwriting',
  policies: 'Policies', certificates: 'Certificates', billing: 'Billing',
};

const option = (value: string, label: string) => ({ value, label });

export function SubscriptionPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const canManage = usePermission('admin.users.manage');
  const query = useOperationsQuery<SubscriptionInfo>('/admin/subscription');
  const [action, setAction] = useState<ActionSpec | null>(null);
  const info = query.data;
  const plan = info?.plan;
  const sub = info?.subscription;
  const usage = info?.usage;
  const statusTone = (s: string) => s === 'ACTIVE' ? 'success' as const : s === 'EXPIRED' ? 'danger' as const : 'neutral' as const;

  const editPlan = () => setAction({
    title: 'Edit plan', path: '/admin/subscription', confirm: 'Save', fields: [
      { name: 'plan_name', label: 'Plan name', required: true, maxLength: 255, value: plan!.name },
      { name: 'max_users', label: 'Seat limit', type: 'number', value: plan!.max_users != null ? String(plan!.max_users) : '' },
      { name: 'end_date', label: 'End date', type: 'date', value: sub!.end_date ?? '' },
    ],
  });

  const editModules = () => setAction({
    title: 'Edit modules', path: '/admin/subscription', confirm: 'Save', fields:
      Object.entries(MODULE_LABELS).map(([key, label]) => ({
        name: `mod_${key}`, label, type: 'checkbox' as const, value: plan!.modules.includes(key) ? 'true' : '',
      })),
    transform: (values) => ({ modules: Object.entries(values).filter(([k, v]) => k.startsWith('mod_') && v === 'true').map(([k]) => k.replace('mod_', '')) }),
  });

  return <Surface title="Subscription" subtitle={plan?.name} actions={<Refresh query={query} />}>
    <QueryState query={query} />
    {info && !plan && <p className="ops-muted" style={{ padding: '16px 0' }}>No active subscription found.</p>}
    {plan && sub && usage && <>
      <Tabs value={tab} options={[option('overview', 'Overview'), option('modules', 'Modules')]}
        change={v => setParams(p => { const n = new URLSearchParams(p); n.set('tab', v); return n; })} />
      {tab === 'overview' && <>
        <dl className="ops-summary" data-testid="subscription-summary">
          <div><dt>Plan</dt><dd>{plan.name} <span className="ops-muted">({plan.code})</span></dd></div>
          <div><dt>Status</dt><dd><StatusBadge tone={statusTone(sub.status)}>{sub.status}</StatusBadge></dd></div>
          <div><dt>Start date</dt><dd>{sub.start_date}</dd></div>
          <div><dt>End date</dt><dd>{sub.end_date ?? 'No end date'}</dd></div>
          <div><dt>Active members</dt><dd>{usage.active_members}{plan.max_users != null && ` of ${plan.max_users}`}</dd></div>
        </dl>
        {plan.max_users != null && <div style={{ padding: '16px 0' }}>
          <div className="ops-muted" style={{ marginBottom: 6 }}>Seat usage</div>
          <div style={{ height: 8, background: 'var(--hz-bg-muted, #f0f0f0)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (usage.active_members / plan.max_users) * 100)}%`,
              background: usage.active_members >= plan.max_users ? 'var(--hz-danger, #dc2626)' : 'var(--hz-primary, #153980)',
              borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
          <div className="ops-muted" style={{ marginTop: 4 }}>{usage.active_members} of {plan.max_users} seats used</div>
        </div>}
        {canManage && <div style={{ paddingTop: 8 }}>
          <button className="hz-button hz-button-secondary" data-testid="edit-plan" onClick={editPlan}><Pencil size={15} />Edit plan</button>
        </div>}
      </>}
      {tab === 'modules' && <>
        <div className="ops-table" data-testid="subscription-modules">
          <table><thead><tr><th>Module</th><th>Enabled</th></tr></thead>
            <tbody>{Object.keys(MODULE_LABELS).map(m => {
              const enabled = plan.modules.includes(m);
              return <tr key={m}><td>{MODULE_LABELS[m] ?? m}</td><td>{enabled
                ? <Check size={16} style={{ color: 'var(--hz-success, #15803d)' }} />
                : <X size={16} style={{ color: 'var(--hz-text-muted)' }} />}</td></tr>;
            })}</tbody>
          </table>
        </div>
        {canManage && <div style={{ paddingTop: 8 }}>
          <button className="hz-button hz-button-secondary" data-testid="edit-modules" onClick={editModules}><Pencil size={15} />Edit modules</button>
        </div>}
      </>}
    </>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => setAction(null)} />}
  </Surface>;
}
