import React, { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Pencil, Plus } from 'lucide-react';
import { ActionDialog, ActionSpec, Grid, QueryState, reason, Refresh, SearchBox, Surface, Tabs } from '../operations/ui';
import { Permission, Proposal, Role, useOperationsQuery } from '../operations/data';
import { Proposals } from './UsersPage';
import { moduleLabel, permissionLabel } from '../operations/accessLabels';

const option = (value: string, label: string) => ({ value, label });

export function RolesPage() {
  const { roleId } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = roleId ? (params.get('tab') === 'approvals' ? 'approvals' : 'permissions') : 'list';
  const navigate = useNavigate();
  const roles = useOperationsQuery<Role[]>('/admin/roles', !roleId);
  const role = useOperationsQuery<Role>(`/admin/roles/${roleId}`, !!roleId);
  const catalogue = useOperationsQuery<Permission[]>('/admin/permissions', !!roleId && tab === 'permissions');
  const proposals = useOperationsQuery<Proposal[]>(`/admin/roles/${roleId}/permission-proposals`, !!roleId);
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [filter, setFilter] = useState('');
  const [notice, setNotice] = useState('');
  const [technical, setTechnical] = useState(false);
  const granted = new Set(role.data?.permissions?.map(p => p.id));
  const matchingRoles = roles.data?.filter(r => `${r.name} ${r.description}`.toLowerCase().includes(filter.toLowerCase())) ?? [];
  const matchingPermissions = catalogue.data?.filter(p =>
    `${permissionLabel(p.code)} ${moduleLabel(p.module)} ${p.code} ${p.description}`.toLowerCase().includes(filter.toLowerCase())) ?? [];
  const pendingCount = proposals.data?.filter(p => p.status === 'PENDING').length ?? 0;
  return <Surface
    title={roleId ? role.data?.name ?? 'Role' : 'Roles & permissions'}
    back={roleId ? () => navigate('/admin/roles/list') : undefined}
    subtitle={role.data?.description}
    actions={<>
      <Refresh query={roleId ? role : roles} />
      {!roleId && <button className="hz-button hz-button-primary" onClick={() => setAction({
        title: 'New role', path: '/admin/roles', fields: [
          { name: 'name', label: 'Name', required: true, maxLength: 64 },
          { name: 'description', label: 'Description' },
        ],
      })}><Plus size={15} />New role</button>}
      {roleId && role.data?.editable && <button className="hz-button hz-button-secondary" data-testid="edit-role" onClick={() => setAction({
        title: 'Edit role', path: `/admin/roles/${roleId}`, fields: [
          { name: 'name', label: 'Name', required: true, maxLength: 64, value: role.data!.name },
          { name: 'description', label: 'Description', value: role.data!.description ?? '' },
        ],
      })}><Pencil size={15} />Edit role</button>}
    </>}
  >
    {notice && <div role="status" className="ops-notice">{notice}</div>}
    {!roleId ? <>
      <QueryState query={roles} />
      <div className="ops-toolbar"><SearchBox value={filter} label="Search roles" onSearch={setFilter} /></div>
      {roles.data && <Grid headers={['Role', 'Responsibilities', 'Role type']} empty={!matchingRoles.length}>
        {matchingRoles.map(r => <tr key={r.id}>
          <td><Link className="ops-link" to={`/admin/roles/list/${r.id}`}>{r.name}</Link></td>
          <td>{r.description || 'No description provided'}</td>
          <td>{r.editable ? 'Tenant-defined' : 'Platform-managed'}</td>
        </tr>)}
      </Grid>}
    </> : <>
      <QueryState query={role} />
      <Tabs value={tab} options={[
        option('permissions', 'Permissions'),
        option('approvals', `Approvals${pendingCount ? ` (${pendingCount})` : ''}`),
      ]} change={v => setParams({ tab: v })} />
      {tab === 'permissions' && <>
        <QueryState query={catalogue} />
        <div className="ops-toolbar">
          <SearchBox value={filter} label="Search permissions" onSearch={setFilter} />
          <label><input type="checkbox" checked={technical} onChange={e => setTechnical(e.target.checked)} /> Show technical codes</label>
          {role.data && !role.data.editable && <span>Platform-managed role</span>}
        </div>
        {role.data && catalogue.data && <Grid headers={['Granted', 'Module', 'Permission', 'Details']} empty={!matchingPermissions.length}>
          {matchingPermissions.map(p => {
            const pending = proposals.data?.some(a => a.permission_code === p.code && a.status === 'PENDING');
            return <tr key={p.id}>
              <td><input type="checkbox" data-testid={`permission-${p.code}`} aria-label={permissionLabel(p.code)}
                checked={granted.has(p.id)}
                disabled={!role.data.editable || p.grantable === false || pending || !proposals.isSuccess}
                onChange={() => setAction({
                  title: `${granted.has(p.id) ? 'Remove' : 'Grant'} permission`,
                  path: `/admin/roles/${roleId}/permission-proposals`, fields: [reason],
                  body: { permission_id: p.id, action: granted.has(p.id) ? 'REMOVE' : 'ADD' },
                  confirm: 'Submit for approval', message: permissionLabel(p.code),
                })} />
              </td>
              <td>{moduleLabel(p.module)}</td>
              <td>{permissionLabel(p.code)}
                {technical && <div className="ops-muted"><code>{p.code}</code></div>}
                {pending && <div className="ops-muted">Pending approval</div>}
                {p.reserved && <div className="ops-muted">Controlled permission</div>}
              </td>
              <td>{p.description}</td>
            </tr>;
          })}
        </Grid>}
      </>}
      {tab === 'approvals' && <>
        <QueryState query={proposals} />
        {proposals.data && <Proposals rows={proposals.data} />}
      </>}
    </>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => { setNotice(action.path.endsWith('permission-proposals') ? 'Submitted for approval. Access changes after a different administrator approves.' : 'Change saved.'); setAction(null); }} />}
  </Surface>;
}
