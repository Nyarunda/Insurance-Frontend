import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Plus } from 'lucide-react';
import { hasPermission, useMe } from '../../lib/auth/me';
import {
  ActionDialog, ActionSpec, Grid, QueryState, Refresh, SearchBox, Status, Surface, Tabs,
} from '../operations/ui';
import { useOperationsQuery } from '../operations/data';
import { ADMIN_USERS_MANAGE, AUDIT_VIEW, DELEGATION_MANAGE } from '../permissions';

interface RegionRow { id: string; code: string; name: string; is_active: boolean; etag: string }
interface BranchRow {
  id: string; code: string; name: string; is_head_office: boolean; is_active: boolean; etag: string;
  region: { id: string; code: string; name: string } | null;
}
interface HierarchyResult { regions: RegionRow[]; branches: BranchRow[] }

export function BranchHierarchyPage() {
  const me = useMe().data;
  const manage = hasPermission(me, ADMIN_USERS_MANAGE);
  const query = useOperationsQuery<HierarchyResult>('/admin/branch-hierarchy');
  const [tab, setTab] = useState('branches');
  const [action, setAction] = useState<ActionSpec | null>(null);
  const regions = query.data?.regions ?? [];
  const branches = query.data?.branches ?? [];
  const regionOptions = regions.filter(r => r.is_active).map(r => ({ value: r.id, label: `${r.code} — ${r.name}` }));

  return <Surface title="Branch hierarchy" subtitle="Tenant branches and regions" actions={<>
    <Refresh query={query} />
    {manage && tab === 'branches' && <button className="hz-button hz-button-primary" onClick={() => setAction({
      title: 'New branch', path: '/admin/branches', confirm: 'Create branch', fields: [
        { name: 'code', label: 'Code', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'region_id', label: 'Region', options: regionOptions },
        { name: 'is_head_office', label: 'Head office', type: 'checkbox' },
      ], transform: v => ({
        code: v.code, name: v.name, region_id: v.region_id || null, is_head_office: v.is_head_office === 'true',
      }),
    })}><Plus size={15} />New branch</button>}
    {manage && tab === 'regions' && <button className="hz-button hz-button-primary" onClick={() => setAction({
      title: 'New region', path: '/admin/regions', confirm: 'Create region', fields: [
        { name: 'code', label: 'Code', required: true }, { name: 'name', label: 'Name', required: true },
      ],
    })}><Plus size={15} />New region</button>}
  </>}>
    <QueryState query={query} />
    {query.data && <>
      <Tabs value={tab} change={setTab} options={[{ value: 'branches', label: 'Branches' }, { value: 'regions', label: 'Regions' }]} />
      {tab === 'branches' && <Grid headers={['Code','Branch','Region','Head office','Status','']} empty={!branches.length}>
        {branches.map(row => <tr key={row.id}>
          <td>{row.code}</td><td>{row.name}</td><td>{row.region ? `${row.region.code} — ${row.region.name}` : '—'}</td>
          <td>{row.is_head_office ? 'Yes' : 'No'}</td><td><Status value={row.is_active ? 'ACTIVE' : 'INACTIVE'} /></td>
          <td>{manage && <button className="hz-button hz-button-secondary" onClick={() => setAction({
            title: `Edit ${row.code}`, path: `/admin/branches/${row.id}`, method: 'PATCH', ifMatch: row.etag,
            fields: [
              { name: 'name', label: 'Name', required: true, value: row.name },
              { name: 'region_id', label: 'Region', value: row.region?.id ?? '', options: regionOptions },
              { name: 'is_head_office', label: 'Head office', type: 'checkbox', value: row.is_head_office ? 'true' : '' },
              { name: 'is_active', label: 'Active', type: 'checkbox', value: row.is_active ? 'true' : '' },
            ], transform: v => ({
              name: v.name, region_id: v.region_id || null,
              is_head_office: v.is_head_office === 'true', is_active: v.is_active === 'true',
            }),
          })}>Edit</button>}</td>
        </tr>)}
      </Grid>}
      {tab === 'regions' && <Grid headers={['Code','Region','Status','']} empty={!regions.length}>
        {regions.map(row => <tr key={row.id}>
          <td>{row.code}</td><td>{row.name}</td><td><Status value={row.is_active ? 'ACTIVE' : 'INACTIVE'} /></td>
          <td>{manage && <button className="hz-button hz-button-secondary" onClick={() => setAction({
            title: `Edit ${row.code}`, path: `/admin/regions/${row.id}`, method: 'PATCH', ifMatch: row.etag,
            fields: [
              { name: 'name', label: 'Name', required: true, value: row.name },
              { name: 'is_active', label: 'Active', type: 'checkbox', value: row.is_active ? 'true' : '' },
            ], transform: v => ({ name: v.name, is_active: v.is_active === 'true' }),
          })}>Edit</button>}</td>
        </tr>)}
      </Grid>}
    </>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => setAction(null)} />}
  </Surface>;
}

interface DelegationOptionUser { id: string; email: string }
interface DelegationOptions {
  users: DelegationOptionUser[]; definitions: { code: string; name: string }[];
  branches: { id: string; code: string; name: string }[]; delegation_max_days: number;
}
interface DelegationRow {
  id: string; delegator_email: string | null; delegate_email: string | null; max_amount: string | null; currency: string;
  branch_id: string | null; effective_from: string; effective_to: string; reason: string; status: string;
  definitions: string[]; etag: string;
}

export function DelegationsPage() {
  const me = useMe().data;
  const manage = hasPermission(me, DELEGATION_MANAGE);
  const query = useOperationsQuery<{ results: DelegationRow[] }>('/workflows/delegations');
  const options = useOperationsQuery<DelegationOptions>('/workflows/delegations/options');
  const [action, setAction] = useState<ActionSpec | null>(null);
  const users = options.data?.users ?? [];
  const definitions = options.data?.definitions ?? [];
  const branches = options.data?.branches ?? [];

  return <Surface title="Delegations" subtitle="Temporary workflow authority substitution; business approvals still happen in My Work Queue" actions={<>
    <Refresh query={{ isFetching: query.isFetching || options.isFetching, refetch: () => { void query.refetch(); void options.refetch(); } }} />
    {manage && <button className="hz-button hz-button-primary" disabled={!options.data} onClick={() => setAction({
      title: 'New workflow delegation', path: '/workflows/delegations', confirm: 'Create delegation',
      message: `Maximum duration for this tenant: ${options.data?.delegation_max_days ?? 30} days. Only workflow definitions with delegable stages are accepted.`,
      fields: [
        { name: 'delegator_user_id', label: 'Delegator', required: true, options: users.map(u => ({ value: u.id, label: u.email })) },
        { name: 'delegate_user_id', label: 'Delegate', required: true, options: users.map(u => ({ value: u.id, label: u.email })) },
        { name: 'definition_codes', label: 'Workflow codes (comma-separated)', required: true,
          value: definitions.map(d => d.code).slice(0, 1).join(',') },
        { name: 'branch_id', label: 'Branch limit (optional)', options: branches.map(b => ({ value: b.id, label: `${b.code} — ${b.name}` })) },
        { name: 'effective_from', label: 'Effective from (ISO date/time)', required: true },
        { name: 'effective_to', label: 'Effective to (ISO date/time)', required: true },
        { name: 'max_amount', label: 'Maximum amount (optional)', type: 'number' },
        { name: 'currency', label: 'Currency', value: 'KES', required: true },
        { name: 'reason', label: 'Reason', type: 'textarea', required: true },
      ], transform: v => ({
        delegator_user_id: v.delegator_user_id, delegate_user_id: v.delegate_user_id,
        definition_codes: v.definition_codes.split(',').map(x => x.trim().toUpperCase()).filter(Boolean),
        branch_id: v.branch_id || null, effective_from: v.effective_from, effective_to: v.effective_to,
        max_amount: v.max_amount || null, currency: v.currency.trim().toUpperCase(), reason: v.reason,
      }),
    })}><Plus size={15} />New delegation</button>}
  </>}>
    <QueryState query={query} /><QueryState query={options} />
    {query.data && <Grid headers={['Delegator','Delegate','Workflows','Effective','Limit','Status','']} empty={!query.data.results.length}>
      {query.data.results.map(row => <tr key={row.id}>
        <td>{row.delegator_email ?? 'Unknown user'}</td><td>{row.delegate_email ?? 'Unknown user'}</td>
        <td>{row.definitions.join(', ') || '—'}</td>
        <td>{row.effective_from} → {row.effective_to}</td>
        <td>{row.max_amount ? `${row.currency} ${row.max_amount}` : 'No amount limit'}</td>
        <td><Status value={row.status} /></td>
        <td>{manage && row.status === 'ACTIVE' && <button className="hz-button hz-button-secondary" onClick={() => setAction({
          title: 'Revoke delegation', path: `/workflows/delegations/${row.id}/revoke`, ifMatch: row.etag,
          confirm: 'Revoke', fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true }],
          message: 'This stops future delegated workflow actions. It does not approve or reject any pending business record.',
        })}>Revoke</button>}</td>
      </tr>)}
    </Grid>}
    <p className="ops-muted">Approve and Reject are intentionally not available here. Decisions are made only through workflow assignments.</p>
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => setAction(null)} />}
  </Surface>;
}

interface AuditRow {
  id: string; actor_id: string; actor_email: string | null; timestamp: string; ip_address: string | null;
  correlation_id: string; action: string; resource_type: string; resource_id: string;
}
interface AuditDetail extends AuditRow { before_state: unknown; after_state: unknown }

export function AuditLogsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  if (eventId) return <AuditDetailPage eventId={eventId} back={() => navigate('/admin/audit-logs/list')} />;
  return <AuditList />;
}

function AuditList() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const path = useMemo(() => `/admin/audit-logs?q=${encodeURIComponent(q)}&page=1&page_size=50`, [q]);
  const query = useOperationsQuery<{ results: AuditRow[]; count: number; page: number; page_size: number }>(path);
  return <Surface title="Audit logs" subtitle="Append-only tenant audit trail" actions={<Refresh query={query} />}>
    <SearchBox value={q} onSearch={setQ} label="Search action, resource or correlation ID" />
    <QueryState query={query} />
    {query.data && <Grid headers={['Time','Actor','Action','Resource','Correlation','']} empty={!query.data.results.length}>
      {query.data.results.map(row => <tr key={row.id}>
        <td>{row.timestamp}</td><td>{row.actor_email ?? row.actor_id}</td><td>{row.action}</td>
        <td>{row.resource_type} · {row.resource_id}</td><td><code>{row.correlation_id || '—'}</code></td>
        <td><button className="hz-button hz-button-secondary" onClick={() => navigate(`/admin/audit-logs/list/${row.id}`)}>View</button></td>
      </tr>)}
    </Grid>}
  </Surface>;
}

function AuditDetailPage({ eventId, back }: { eventId: string; back: () => void }) {
  const query = useOperationsQuery<AuditDetail>(`/admin/audit-logs/${eventId}`);
  const row = query.data;
  return <Surface title="Audit event" subtitle={row?.action} back={back} actions={<Refresh query={query} />}>
    <QueryState query={query} />
    {row && <>
      <dl className="ops-summary">
        <div><dt>Timestamp</dt><dd>{row.timestamp}</dd></div>
        <div><dt>Actor</dt><dd>{row.actor_email ?? row.actor_id}</dd></div>
        <div><dt>Resource</dt><dd>{row.resource_type} · {row.resource_id}</dd></div>
        <div><dt>Correlation ID</dt><dd><code>{row.correlation_id || '—'}</code></dd></div>
        <div><dt>IP address</dt><dd>{row.ip_address ?? '—'}</dd></div>
      </dl>
      <h3 className="ops-subsection-title">Before</h3><pre className="ops-code">{JSON.stringify(row.before_state, null, 2)}</pre>
      <h3 className="ops-subsection-title">After</h3><pre className="ops-code">{JSON.stringify(row.after_state, null, 2)}</pre>
    </>}
  </Surface>;
}
