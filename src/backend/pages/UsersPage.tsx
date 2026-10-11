import React, { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Check, Copy, Plus, Shield, UserPlus, X } from 'lucide-react';
import { useMe, usePermission } from '../../lib/auth/me';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { ActionDialog, ActionSpec, Grid, Pager, pretty, QueryState, reason, Refresh, SearchBox, Status, Surface, Tabs } from '../operations/ui';
import { Assignment, Invitation, Member, PageResult, Proposal, UserAccess, UserOptions, useOperationsQuery } from '../operations/data';
import { moduleLabel, permissionLabel } from '../operations/accessLabels';

const VIEW = 'admin.users.view';
const MANAGE = 'admin.users.manage';
const option = (id: string, label: string) => ({ value: id, label });
const scopes = ['OWN', 'BRANCH', 'REGION', 'ALL'].map(s => option(s, pretty(s)));

export function UsersPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const tab = params.get('tab') === 'invitations' ? 'invitations' : 'users';
  const canManage = usePermission(MANAGE);
  const users = useOperationsQuery<PageResult<Member>>(`/admin/users?${new URLSearchParams({ q, status, page: String(page), page_size: '25' })}`, tab === 'users');
  const invitations = useOperationsQuery<{ results: Invitation[] }>('/admin/user-invitations', tab === 'invitations');
  const options = useOperationsQuery<UserOptions>('/admin/user-options', canManage);
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [issued, setIssued] = useState<Invitation | null>(null);
  const [notice, setNotice] = useState('');
  const update = (values: Record<string, string>) => setParams(p => { const n = new URLSearchParams(p); Object.entries(values).forEach(([k, v]) => v ? n.set(k, v) : n.delete(k)); return n; });
  return <Surface title="Users" subtitle={users.data ? `${users.data.count} tenant members` : undefined} actions={<><Refresh query={tab === 'users' ? users : invitations} />{canManage && <button className="hz-button hz-button-primary" disabled={!options.data} onClick={() => setAction({ title: 'Invite user', path: '/admin/user-invitations', confirm: 'Create invitation', fields: [{ name: 'email', label: 'Email', type: 'email', required: true }, { name: 'default_branch_id', label: 'Default branch', required: true, options: options.data!.branches.map(b => option(b.id, `${b.code} - ${b.name}`)) }] })}><UserPlus size={15} />Invite user</button>}</>}>
    {notice && <div role="status" className="ops-notice">{notice}</div>}
    {options.isError && <QueryState query={options} />}
    <Tabs value={tab} options={[option('users', 'Members'), option('invitations', 'Invitations')]} change={v => update({ tab: v, page: '' })} />
    {tab === 'users' ? <><div className="ops-toolbar"><SearchBox value={q} label="Search email" onSearch={v => update({ q: v, page: '' })} /><select className="hz-field p-2" aria-label="Member status" value={status} onChange={e => update({ status: e.target.value, page: '' })}><option value="">All statuses</option>{['ACTIVE', 'SUSPENDED', 'REVOKED'].map(s => <option key={s}>{s}</option>)}</select></div><QueryState query={users} />{users.data && <><Grid headers={['User', 'Default branch', 'Roles', 'Status', 'Member since']} empty={!users.data.results.length}>{users.data.results.map(u => <tr key={u.user_id}><td><Link className="ops-link" to={`/admin/users/list/${u.user_id}`}>{u.email}</Link></td><td>{u.default_branch?.name ?? 'Unassigned'}</td><td>{u.roles.map(r => r.name).join(', ') || 'No roles'}</td><td><Status value={u.status} /></td><td>{u.member_from}</td></tr>)}</Grid><Pager page={page} count={users.data.count} size={25} change={p => update({ page: String(p) })} /></>}</> : <><QueryState query={invitations} />{invitations.data && <Grid headers={['Email', 'Branch', 'Status', 'Expires', '']} empty={!invitations.data.results.length}>{invitations.data.results.map(i => <tr key={i.id}><td>{i.email}</td><td>{i.default_branch?.name}</td><td><Status value={i.status} /></td><td>{new Date(i.expires_at).toLocaleString()}</td><td>{canManage && i.status === 'PENDING' && <button className="hz-button hz-button-secondary" onClick={() => setAction({ title: 'Revoke invitation', path: `/admin/user-invitations/${i.id}/revoke`, fields: [], confirm: 'Revoke', message: i.email })}>Revoke</button>}</td></tr>)}</Grid>}</>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={data => { setAction(null); const invite = data as Invitation; if (invite.secret) setIssued(invite); else setNotice('Invitation revoked.'); }} />}
    {issued && <InvitationSecret invitation={issued} close={() => setIssued(null)} />}
  </Surface>;
}

function InvitationSecret({ invitation, close }: { invitation: Invitation; close: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/accept-invitation#${new URLSearchParams({ id: invitation.id, secret: invitation.secret! })}`;
  return <DialogFrame titleId="invitation-secret" title="Invitation created" onClose={close} dismissOnBackdrop={false} size="lg" footer={<button className="hz-button hz-button-primary" onClick={close}>Done</button>}><p className="text-sm mb-3">{invitation.email}</p><p className="text-sm mb-3">Keep this invitation private. It expires at {new Date(invitation.expires_at).toLocaleString()}.</p><input aria-label="Private invitation link" readOnly className="hz-field w-full p-2" value={link} /><button className="hz-button hz-button-secondary mt-3" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); } }}><Copy size={15} />{copied ? 'Copied' : 'Copy invitation'}</button></DialogFrame>;
}

export function UserWorkspace() {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const validTabs = ['overview', 'roles', 'access', 'restrictions', 'approvals'] as const;
  const raw = params.get('tab') ?? 'overview';
  const tab = (validTabs as readonly string[]).includes(raw) ? raw : 'overview';
  const path = `/admin/users/${encodeURIComponent(userId)}`;
  const user = useOperationsQuery<Member>(path);
  const access = useOperationsQuery<UserAccess>(`${path}/access`, tab !== 'overview');
  const options = useOperationsQuery<UserOptions>('/admin/user-options', usePermission(VIEW));
  const me = useMe().data;
  const manage = usePermission(MANAGE) && me?.user.id !== userId;
  const active = manage && user.data?.status === 'ACTIVE';
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [notice, setNotice] = useState('');
  const branches = options.data?.branches.map(b => option(b.id, `${b.code} - ${b.name}`)) ?? [];
  const newRole = () => setAction({ title: 'Assign role', path: `${path}/roles`, fields: [{ name: 'role_id', label: 'Role', required: true, options: options.data!.roles.map(r => option(r.id, `${r.name}${r.requires_approval ? ' (approval required)' : ''}`)) }, { name: 'scope', label: 'Scope', value: 'BRANCH', required: true, options: scopes.filter(s => s.value !== 'OWN') }, { name: 'branch_id', label: 'Branch', options: branches }, reason], transform: values => ({ ...values, branch_id: values.scope === 'ALL' ? null : values.branch_id }) });
  const chooseAction = (spec: ActionSpec) => setAction(spec);
  const endRole = (assignment: Assignment) => {
    const protectedRole = options.data?.roles.find(r => r.id === assignment.role_id)?.requires_approval;
    setAction(protectedRole
      ? { title: `End ${assignment.name}`, path: `${path}/role-proposals`, fields: [reason], confirm: 'Submit for approval', body: { role_id: assignment.role_id, scope: assignment.scope, branch_id: assignment.branch_id ?? null, action: 'REMOVE' } }
      : { title: `End ${assignment.name}`, path: `${path}/roles/${assignment.id}/end`, fields: [reason] });
  };
  return <Surface title={user.data?.email ?? 'User'} back={() => navigate('/admin/users/list')} subtitle={user.data && <Status value={user.data.status} />} actions={<><Refresh query={user} />{manage && user.data && user.data.status !== 'REVOKED' && <><button className="hz-button hz-button-secondary" onClick={() => setAction({ title: user.data!.status === 'ACTIVE' ? 'Suspend user' : 'Reactivate user', path: `${path}/${user.data!.status === 'ACTIVE' ? 'suspend' : 'reactivate'}`, fields: [reason] })}>{user.data.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</button><button className="hz-button hz-button-secondary" onClick={() => setAction({ title: 'Revoke membership', path: `${path}/revoke`, fields: [reason], confirm: 'Revoke membership', message: 'This permanently ends membership in this tenant and revokes its sessions.' })}>Revoke</button></>}</>}>
    <QueryState query={user} />{notice && <div role="status" className="ops-notice">{notice}</div>}
    <Tabs value={tab} options={[
      option('overview', 'Overview'),
      option('roles', 'Roles'),
      option('access', 'Branch access'),
      option('restrictions', 'Restrictions'),
      option('approvals', `Approvals${access.data?.proposals.filter(p => p.status === 'PENDING').length ? ` (${access.data.proposals.filter(p => p.status === 'PENDING').length})` : ''}`),
    ]} change={v => setParams({ tab: v })} />
    {tab === 'overview' && user.data && <><dl className="ops-summary">
      <div><dt>Email</dt><dd>{user.data.email}</dd></div>
      <div><dt>Default branch</dt><dd>{user.data.default_branch?.name ?? 'Unassigned'}</dd></div>
      <div><dt>Member since</dt><dd>{user.data.member_from}</dd></div>
      <div><dt>Identity</dt><dd>{user.data.identity_active ? 'Active' : 'Inactive'}</dd></div>
      <div><dt>Profile</dt><dd>{pretty(user.data.profile_status ?? 'Unavailable')}</dd></div>
      <div><dt>Member until</dt><dd>{user.data.member_to ?? 'No end date'}</dd></div>
    </dl><h2 className="ops-section-title">Current roles</h2><Grid headers={['Role', 'Scope', 'Branch']} empty={!user.data.roles.length}>{user.data.roles.map((r, i) => <tr key={i}><td>{r.name}</td><td>{pretty(r.scope)}</td><td>{r.branch_code ?? 'All branches'}</td></tr>)}</Grid></>}
    {tab === 'roles' && <>
      <QueryState query={access} /><QueryState query={options} />
      <div className="ops-toolbar">{active && options.data && <button className="hz-button hz-button-primary" onClick={newRole}><Shield size={15} />Assign role</button>}<Refresh query={access} /></div>
      {access.data && <Grid headers={['Role', 'Scope', 'Branch', 'From', 'Until', '']} empty={!access.data.roles.length}>{access.data.roles.map(r => <tr key={r.id}><td>{r.name}</td><td>{pretty(r.scope)}</td><td>{r.branch_name ?? 'All branches'}</td><td>{r.effective_from}</td><td>{r.effective_to ?? 'No end date'}</td><td>{active && !r.effective_to && <button className="hz-button hz-button-secondary" disabled={!options.data} onClick={() => endRole(r)}>End assignment</button>}</td></tr>)}</Grid>}
    </>}
    {tab === 'access' && <>
      <QueryState query={access} /><QueryState query={options} />
      <div className="ops-toolbar">{active && options.data && <button className="hz-button hz-button-secondary" onClick={() => setAction({ title: 'Grant branch access', path: `${path}/branch-access`, fields: [{ name: 'branch_id', label: 'Branch', required: true, options: branches }, { name: 'scope', label: 'Scope', value: 'BRANCH', required: true, options: scopes }] })}><Plus size={15} />Branch access</button>}<Refresh query={access} /></div>
      {access.data && <Grid headers={['Branch', 'Scope', 'From', 'Until', '']} empty={!access.data.branches.length}>{access.data.branches.map(b => <tr key={b.id}><td>{b.name}</td><td>{pretty(b.scope)}</td><td>{b.effective_from}</td><td>{b.effective_to ?? 'No end date'}</td><td>{active && !b.effective_to && <button className="hz-button hz-button-secondary" onClick={() => setAction({ title: `End access to ${b.name}`, path: `${path}/branch-access/${b.id}/end`, fields: [], message: 'Access ends after the current tenant business date. Dependent roles must retain valid branch access.' })}>End access</button>}</td></tr>)}</Grid>}
    </>}
    {tab === 'restrictions' && <>
      <QueryState query={access} /><QueryState query={options} />
      <div className="ops-toolbar">{active && options.data && <button className="hz-button hz-button-secondary" onClick={() => setAction({ title: 'Restrict permission', path: `${path}/overrides`, fields: [{ name: 'permission_code', label: 'Permission', required: true, options: options.data!.permissions.map(p => option(p.code, `${moduleLabel(p.module)}: ${permissionLabel(p.code)}`)) }, reason] })}>Restrict permission</button>}<Refresh query={access} /></div>
      {access.data && <Grid headers={['Permission', 'Effect', 'Reason', 'Until', '']} empty={!access.data.overrides.length}>{access.data.overrides.map(o => <tr key={o.id}><td title={o.code}>{permissionLabel(o.code)}</td><td>{pretty(o.effect)}</td><td>{o.reason}</td><td>{o.effective_to ?? 'No end date'}</td><td>{active && !o.effective_to && <button className="hz-button hz-button-secondary" onClick={() => setAction({ title: 'End permission restriction', path: `${path}/overrides/${o.id}/end`, fields: [], message: 'The restriction remains effective through the current tenant business date.' })}>End restriction</button>}</td></tr>)}</Grid>}
    </>}
    {tab === 'approvals' && <>
      <QueryState query={access} />
      {access.data && <Proposals rows={access.data.proposals} canDecide={!!active} actorId={me?.user.id} path={`${path}/role-proposals`} choose={chooseAction} isOwnWorkspace={me?.user.id === userId} />}
    </>}
    {action && <UserAction spec={action} roles={options.data?.roles ?? []} close={() => setAction(null)} done={data => { setAction(null); setNotice((data as { status?: string }).status === 'PENDING' ? 'Submitted for approval by another administrator.' : 'Change saved.'); }} />}
  </Surface>;
}

function UserAction({ spec, roles, ...rest }: { spec: ActionSpec; roles: UserOptions['roles']; close: () => void; done: (data: unknown) => void }) {
  // Selection decides the endpoint before sending, never retry a refused direct grant as an escalation.
  const [selection, setSelection] = useState('');
  if (!spec.path.endsWith('/roles')) return <ActionDialog spec={spec} {...rest} />;
  if (!selection) return <DialogFrame titleId="role-choice" title="Choose role" onClose={rest.close} footer={<button className="hz-button hz-button-secondary" onClick={rest.close}>Cancel</button>}><select aria-label="Role to assign" className="hz-field p-2 w-full" value="" onChange={e => setSelection(e.target.value)}><option value="">Select...</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></DialogFrame>;
  const role = roles.find(r => r.id === selection)!;
  return <ActionDialog spec={{ ...spec, title: `Assign ${role.name}`, path: role.requires_approval ? spec.path.replace(/\/roles$/, '/role-proposals') : spec.path, fields: spec.fields.filter(f => f.name !== 'role_id'), body: { role_id: selection }, confirm: role.requires_approval ? 'Submit for approval' : 'Assign role' }} {...rest} />;
}

export function Proposals({ rows, canDecide, actorId, path, choose, isOwnWorkspace }: { rows: Proposal[]; canDecide: boolean; actorId?: string; path: string; choose: (action: ActionSpec) => void; isOwnWorkspace?: boolean }) {
  const actionLabel = (p: Proposal) => p.action === 'ADD' ? 'Grant' : p.action === 'ASSIGN' ? 'Assign' : pretty(p.action);
  return <Grid headers={['Change', 'Reason', 'Status', 'Decision']} empty={!rows.length}>
    {rows.map(p => {
      const target = p.name ?? permissionLabel(p.permission_code ?? 'Permission');
      const selfProposed = p.proposed_by === actorId;
      return <tr key={p.id}>
        <td>{actionLabel(p)}: {target}
          <div className="ops-muted">{p.branch_name ?? ''} {p.scope ? pretty(p.scope) : ''}</div>
        </td>
        <td>{p.reason}</td><td><Status value={p.status} /></td>
        <td>{p.status === 'PENDING'
          ? canDecide && !selfProposed
            ? <div className="ops-actions">{['approve', 'reject'].map(d => <button key={d}
                className="hz-icon-button" title={`${pretty(d)} ${target}`}
                onClick={() => choose({ title: `${pretty(d)} change`, message: target, path: `${path}/${p.id}/${d}`, fields: [reason], confirm: pretty(d) })}>
                {d === 'approve' ? <Check size={16} /> : <X size={16} />}
              </button>)}</div>
            : selfProposed ? 'You proposed — another admin must decide'
            : isOwnWorkspace ? 'A different admin must approve changes to your own access'
            : 'Pending approval'
          : null}</td>
      </tr>;
    })}
  </Grid>;
}
