import { useState } from 'react';
import { Link } from 'react-router';
import { Grid, Pager, QueryState, Refresh, SearchBox, Status, Surface } from '../operations/ui';
import { PageResult, useOperationsQuery } from '../operations/data';

interface KycRow {
  id: string; customer_no: string; display_name: string; customer_type: string; kyc_status: string;
  home_branch: { id: string; code: string; name: string }; updated_at: string;
  identifiers: number; verified_identifiers: number; documents: number; verified_documents: number;
  problem_documents: number; due_documents: number;
}
interface KycDesk extends PageResult<KycRow> {
  summary: Record<string, number>;
}

interface WorkbenchRow {
  id: string; proposal_no: string; status: string;
  customer: { id: string; customer_no: string; display_name: string };
  branch: { id: string; code: string; name: string };
  insurer: { code: string; name: string }; product: { code: string; name: string };
  currency: string; total_premium: string; created_at: string; updated_at: string;
  open_requirements: number; open_exceptions: number; routed_exceptions: number;
}
interface UnderwritingDesk extends PageResult<WorkbenchRow> {
  summary: Record<string, number>;
  decisions: 'WORKFLOW_ONLY';
}

const kycStatuses = ['PENDING_VERIFICATION', 'REVIEW_DUE', 'REJECTED', 'IN_PROGRESS', 'NOT_STARTED', 'VERIFIED'];
const proposalStatuses = ['REFERRED', 'UNDER_REVIEW', 'DRAFT', 'READY_TO_BIND', 'BOUND', 'DECLINED', 'CANCELLED'];

export function KycComplianceDeskPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const query = useOperationsQuery<KycDesk>(
    `/clients/kyc-desk?page=${page}&page_size=50${status ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`);

  return <Surface title="KYC Compliance Desk" subtitle="Cross-customer KYC status and verification readiness" actions={<Refresh query={query} />}>
    <div className="ops-toolbar">
      <SearchBox value={q} onSearch={value => { setQ(value); setPage(1); }} label="Customer number or name" />
      <label>Status <select className="hz-field" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All</option>
        {kycStatuses.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
      </select></label>
    </div>
    <QueryState query={query} />
    {query.data && <>
      <dl className="ops-summary">
        {kycStatuses.map(value => <div key={value}><dt>{value.replaceAll('_', ' ')}</dt><dd>{query.data!.summary[value] ?? 0}</dd></div>)}
      </dl>
      <Grid headers={['Customer','Branch','KYC status','Identifiers','Documents','Problems / due','Updated']} empty={!query.data.results.length}>
        {query.data.results.map(row => <tr key={row.id}>
          <td><Link className="ops-link" to={`/customers/list/${row.id}`}>{row.customer_no} — {row.display_name}</Link></td>
          <td>{row.home_branch.code} — {row.home_branch.name}</td>
          <td><Status value={row.kyc_status} /></td>
          <td>{row.verified_identifiers}/{row.identifiers} verified</td>
          <td>{row.verified_documents}/{row.documents} verified</td>
          <td>{row.problem_documents} problem · {row.due_documents} due</td>
          <td>{row.updated_at}</td>
        </tr>)}
      </Grid>
      <Pager page={query.data.page} count={query.data.count} size={query.data.page_size} change={setPage} />
      <p className="ops-muted">This desk is read-only. KYC verification stays on the customer record and existing maker/checker rules.</p>
    </>}
  </Surface>;
}

export function UnderwritingWorkbenchPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const query = useOperationsQuery<UnderwritingDesk>(
    `/underwriting/workbench?page=${page}&page_size=50${status ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`);

  return <Surface title="Underwriting Workbench" subtitle="Proposal readiness, referrals and workflow-routed exceptions" actions={<Refresh query={query} />}>
    <div className="ops-toolbar">
      <SearchBox value={q} onSearch={value => { setQ(value); setPage(1); }} label="Proposal number or customer" />
      <label>Status <select className="hz-field" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All</option>
        {proposalStatuses.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
      </select></label>
    </div>
    <QueryState query={query} />
    {query.data && <>
      <dl className="ops-summary">
        {proposalStatuses.slice(0, 4).map(value => <div key={value}><dt>{value.replaceAll('_', ' ')}</dt><dd>{query.data!.summary[value] ?? 0}</dd></div>)}
      </dl>
      <Grid headers={['Proposal','Customer','Branch','Insurer / product','Premium','Requirements','Exceptions','Status']} empty={!query.data.results.length}>
        {query.data.results.map(row => <tr key={row.id}>
          <td><Link className="ops-link" to={`/proposals/list/${row.id}`}>{row.proposal_no}</Link></td>
          <td>{row.customer.customer_no} — {row.customer.display_name}</td>
          <td>{row.branch.code}</td>
          <td>{row.insurer.name}<br /><span className="ops-muted">{row.product.name}</span></td>
          <td>{row.currency} {row.total_premium}</td>
          <td>{row.open_requirements} open</td>
          <td>{row.open_exceptions} open · {row.routed_exceptions} in workflow</td>
          <td><Status value={row.status} /></td>
        </tr>)}
      </Grid>
      <Pager page={query.data.page} count={query.data.count} size={query.data.page_size} change={setPage} />
      <p className="ops-muted">Read-only desk. Exception decisions are made only through the workflow task/instance action surface.</p>
    </>}
  </Surface>;
}
