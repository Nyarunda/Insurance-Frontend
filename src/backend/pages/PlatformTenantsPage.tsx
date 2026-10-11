import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Plus } from 'lucide-react';
import { useOperationsQuery } from '../operations/data';
import { ActionDialog, ActionSpec, Grid, QueryState, Refresh, Surface, Tabs } from '../operations/ui';
import { StatusBadge } from '../../components/horizon';

interface TenantRow {
  id: string; name: string; slug: string; status: string; created_at: string;
  active_members: number;
  subscription: { status: string; plan_name: string; plan_code: string; end_date: string | null } | null;
}

interface TenantDetail {
  id: string; name: string; slug: string; schema_name: string; status: string; created_at: string;
  active_members: number;
  domains: { domain: string; is_primary: boolean; is_verified: boolean }[];
  subscriptions: { id: string; status: string; start_date: string; end_date: string | null;
    plan_code: string; plan_name: string; max_users: number | null; modules: string[] }[];
}

const statusTone = (s: string) =>
  s === 'ACTIVE' ? 'success' as const : s === 'SUSPENDED' ? 'warning' as const : 'neutral' as const;

export function PlatformTenantsPage() {
  const { tenantId } = useParams();
  return tenantId ? <TenantWorkspace tenantId={tenantId} /> : <TenantList />;
}

function TenantList() {
  const query = useOperationsQuery<TenantRow[]>('/platform/tenants');
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [notice, setNotice] = useState('');
  return <Surface title="Platform tenants" subtitle="Manage all tenants" actions={<>
    <Refresh query={query} />
    <button className="hz-button hz-button-primary" onClick={() => setAction({
      title: 'Create tenant', path: '/platform/tenants', confirm: 'Create', fields: [
        { name: 'name', label: 'Name', required: true },
        { name: 'slug', label: 'Slug', required: true },
        { name: 'domain', label: 'Domain', required: true },
        { name: 'plan_code', label: 'Plan code', required: true },
        { name: 'reason', label: 'Reason' },
      ],
    })}><Plus size={15} />New tenant</button>
  </>}>
    {notice && <div role="status" className="ops-notice">{notice}</div>}
    <QueryState query={query} />
    {query.data && <Grid headers={['Tenant', 'Slug', 'Status', 'Members', 'Plan', 'Subscription end']} empty={!query.data.length}>
      {query.data.map(t => <tr key={t.id}>
        <td><Link className="ops-link" to={`/platform/tenants/list/${t.id}`}>{t.name}</Link></td>
        <td>{t.slug}</td>
        <td><StatusBadge tone={statusTone(t.status)}>{t.status}</StatusBadge></td>
        <td>{t.active_members}</td>
        <td>{t.subscription?.plan_name ?? 'None'}</td>
        <td>{t.subscription?.end_date ?? 'No end date'}</td>
      </tr>)}
    </Grid>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => { setAction(null); setNotice('Tenant created. Run provision_tenant --resume to complete setup.'); }} />}
  </Surface>;
}

function TenantWorkspace({ tenantId }: { tenantId: string }) {
  const navigate = useNavigate();
  const query = useOperationsQuery<TenantDetail>(`/platform/tenants/${tenantId}`);
  const t = query.data;
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('overview');
  return <Surface title={t?.name ?? 'Tenant'} back={() => navigate('/platform/tenants/list')}
    subtitle={t && <StatusBadge tone={statusTone(t.status)}>{t.status}</StatusBadge>}
    actions={<>
      <Refresh query={query} />
      {t && t.status === 'ACTIVE' && <button className="hz-button hz-button-secondary"
        onClick={() => setAction({ title: 'Suspend tenant', path: `/platform/tenants/${tenantId}/suspend`,
          fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true }] })}>Suspend</button>}
      {t && t.status === 'SUSPENDED' && <button className="hz-button hz-button-secondary"
        onClick={() => setAction({ title: 'Reactivate tenant', path: `/platform/tenants/${tenantId}/reactivate`,
          fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true }] })}>Reactivate</button>}
    </>}>
    {notice && <div role="status" className="ops-notice">{notice}</div>}
    <QueryState query={query} />
    {t && <>
      <Tabs value={tab} options={[{ value: 'overview', label: 'Overview' }, { value: 'subscriptions', label: 'Subscriptions' }]} change={setTab} />
      {tab === 'overview' && <>
        <dl className="ops-summary" data-testid="tenant-summary">
          <div><dt>Name</dt><dd>{t.name}</dd></div>
          <div><dt>Slug</dt><dd>{t.slug}</dd></div>
          <div><dt>Schema</dt><dd><code>{t.schema_name}</code></dd></div>
          <div><dt>Status</dt><dd><StatusBadge tone={statusTone(t.status)}>{t.status}</StatusBadge></dd></div>
          <div><dt>Active members</dt><dd>{t.active_members}</dd></div>
          <div><dt>Created</dt><dd>{t.created_at}</dd></div>
        </dl>
        <h3 className="ops-subsection-title">Domains</h3>
        <Grid headers={['Domain', 'Primary', 'Verified']} empty={!t.domains.length}>
          {t.domains.map(d => <tr key={d.domain}>
            <td>{d.domain}</td>
            <td>{d.is_primary ? 'Yes' : 'No'}</td>
            <td>{d.is_verified ? 'Yes' : 'No'}</td>
          </tr>)}
        </Grid>
      </>}
      {tab === 'subscriptions' && <Grid headers={['Plan', 'Status', 'Start', 'End', 'Max users', 'Modules']} empty={!t.subscriptions.length}>
        {t.subscriptions.map(s => <tr key={s.id}>
          <td>{s.plan_name} <span className="ops-muted">({s.plan_code})</span></td>
          <td><StatusBadge tone={statusTone(s.status)}>{s.status}</StatusBadge></td>
          <td>{s.start_date}</td>
          <td>{s.end_date ?? 'No end date'}</td>
          <td>{s.max_users ?? 'Unlimited'}</td>
          <td>{s.modules.join(', ')}</td>
        </tr>)}
      </Grid>}
    </>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => { setAction(null); setNotice('Status updated.'); }} />}
  </Surface>;
}
