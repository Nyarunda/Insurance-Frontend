import React, { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { useMe } from '../../lib/auth/me';
import { useOperationsQuery } from '../operations/data';
import { downloadCsv } from '../operations/export';
import { PrintDocument } from '../operations/PrintDocument';
import { Grid, Pager, QueryState, Refresh, Surface, Tabs } from '../operations/ui';

interface Premium { currency: string; basic_premium: string; levies_total: string; total_premium: string }
interface ProductionTotal extends Premium { policy_count: number }
interface ProductionGroup extends ProductionTotal { bucket: string; label: string; premium_share: string }
interface ProductionPolicy extends Premium { id: string; policy_no: string; bound_date: string; product: string; insurer: string; branch: string; agent?: string | null; sub_agent?: string | null }
interface ReportBase { totals: ProductionTotal[]; count: number; page: number; page_size: number; date_from: string; date_to: string; timezone: string; date_basis: string; premium_basis: string; group_by: string }
export type ProductionReport = ReportBase & ({ view: 'summary'; results: ProductionGroup[] } | { view: 'policies'; results: ProductionPolicy[] });
interface Option { id: string; name: string }
interface ReportOptions { branches: Option[]; products: Option[]; insurers: Option[]; agents: Option[]; sub_agents: Option[] }
const groupLabels: Record<string, string> = { product: 'Product', insurer: 'Insurer', branch: 'Branch', month: 'Binding month', agent: 'Agent', sub_agent: 'Sub-agent' };
const totalColumns = ['Currency', 'Policies', 'Basic premium', 'Levies', 'Bound premium'];
const policyColumns = ['Policy', 'Bound on', 'Product', 'Insurer', 'Branch', 'Agent', 'Sub-agent', 'Currency', 'Basic premium', 'Levies', 'Bound premium'];
const totalValues = (row: ProductionTotal) => [row.currency, row.policy_count, row.basic_premium, row.levies_total, row.total_premium];
const policyValues = (row: ProductionPolicy) => [row.policy_no, row.bound_date, row.product, row.insurer, row.branch, row.agent || 'Unassigned', row.sub_agent || 'Unassigned', row.currency, row.basic_premium, row.levies_total, row.total_premium];
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function ProductionReportPage() {
  const [params, setParams] = useSearchParams();
  const now = new Date();
  const applied = {
    date_from: params.get('date_from') ?? localDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    date_to: params.get('date_to') ?? localDate(now), group_by: params.get('group_by') ?? 'product',
    branch_id: params.get('branch_id') ?? '', product_id: params.get('product_id') ?? '',
    insurer_id: params.get('insurer_id') ?? '', currency: params.get('currency') ?? '',
    agent_id: params.get('agent_id') ?? '', sub_agent_id: params.get('sub_agent_id') ?? '',
  };
  const view = params.get('view') ?? 'summary';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [draft, setDraft] = useState(applied);
  const [validation, setValidation] = useState('');
  const [printing, setPrinting] = useState(false);
  useEffect(() => { setDraft(applied); setValidation(''); }, [params]);
  const me = useMe().data;
  const filters = new URLSearchParams({ ...applied, view, page: String(page), page_size: '25' });
  for (const key of ['branch_id', 'product_id', 'insurer_id', 'agent_id', 'sub_agent_id']) if (!filters.get(key)) filters.delete(key);
  const query = useOperationsQuery<ProductionReport>(`/policies/reports/production?${filters}`);
  const options = useOperationsQuery<ReportOptions>('/policies/reports/production/options');
  const report = query.isError ? undefined : query.data;
  const selected = (key: keyof ReportOptions, id: string) =>
    id ? options.data?.[key]?.find(row => row.id === id)?.name ?? id : `All permitted ${key.replace('_', '-')}`;
  const scope = [selected('branches', applied.branch_id), selected('products', applied.product_id), selected('insurers', applied.insurer_id), selected('agents', applied.agent_id), selected('sub_agents', applied.sub_agent_id), applied.currency || 'All currencies'];
  const exportPage = () => {
    if (!report) return;
    const rows = report.view === 'summary'
      ? [[groupLabels[report.group_by], ...totalColumns, 'Premium mix %'], ...report.results.map(row => [row.label, ...totalValues(row), row.premium_share])]
      : [policyColumns, ...report.results.map(policyValues)];
    downloadCsv(`production-${report.view}-${report.date_from}-${report.date_to}-page-${page}.csv`, [
      ['Production', me?.tenant.name ?? ''], ['Premium basis', 'Original bound; excludes endorsement adjustments'],
      ['Binding date from', report.date_from, 'To', report.date_to, 'Timezone', report.timezone],
      ['Scope', ...scope], ['Page', report.page, 'Total records', report.count], ...rows,
      [], ['Full filtered totals', ...totalColumns], ...report.totals.map(row => ['Total', ...totalValues(row)]),
    ]);
  };
  return <Surface title="Production" subtitle="Original bound premiums" actions={<>
    <Refresh query={query} />
    <button className="hz-button hz-button-secondary" data-testid="production-export" disabled={!report || query.isFetching} onClick={exportPage}><Download size={15} />Export page</button>
    <button className="hz-icon-button" title="Print production page" disabled={!report || query.isFetching} onClick={() => setPrinting(true)}><Printer size={16} /></button>
  </>}>
    <form className="ops-toolbar" data-testid="production-filters" onSubmit={e => {
      e.preventDefault();
      if (draft.date_from > draft.date_to || (Date.parse(draft.date_to) - Date.parse(draft.date_from)) / 86400000 > 365) {
        setValidation('Choose a binding-date range of at most 366 days.'); return;
      }
      setValidation(''); setParams(new URLSearchParams({ ...draft, view }));
    }}>
      <label>From <input className="hz-field p-2" aria-label="Binding date from" type="date" required value={draft.date_from} onChange={e => setDraft(v => ({ ...v, date_from: e.target.value }))} /></label>
      <label>To <input className="hz-field p-2" aria-label="Binding date to" type="date" required value={draft.date_to} onChange={e => setDraft(v => ({ ...v, date_to: e.target.value }))} /></label>
      <label>Group by <select className="hz-field p-2" aria-label="Group production by" value={draft.group_by} disabled={view === 'policies'} onChange={e => setDraft(v => ({ ...v, group_by: e.target.value }))}>
        {Object.entries(groupLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {([['branch_id', 'branches', 'Branch'], ['product_id', 'products', 'Product'], ['insurer_id', 'insurers', 'Insurer'], ['agent_id', 'agents', 'Agent'], ['sub_agent_id', 'sub_agents', 'Sub-agent']] as const).map(([field, key, label]) =>
        <label key={field}>{label} <select className="hz-field p-2" aria-label={`Production ${label.toLowerCase()}`} value={draft[field]} disabled={!options.data} onChange={e => setDraft(v => ({ ...v, [field]: e.target.value }))}>
          <option value="">All permitted {key.replace('_', '-')}</option>{options.data?.[key]?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select></label>)}
      <label>Currency <input className="hz-field p-2 ops-currency" placeholder="All" pattern="[A-Z]{3}" maxLength={3} value={draft.currency} onChange={e => setDraft(v => ({ ...v, currency: e.target.value.toUpperCase() }))} /></label>
      <button className="hz-button hz-button-primary" type="submit">Run report</button>
    </form>
    {validation && <p role="alert">{validation}</p>}
    <QueryState query={options} /><QueryState query={query} />
    <Tabs value={view} options={[{ value: 'summary', label: 'Summary' }, { value: 'policies', label: 'Policies' }]} change={value =>
      setParams(new URLSearchParams({ ...applied, view: value }))} />
    {report && <>
      <div className="ops-muted" style={{ padding: '8px 0' }}>Binding dates: {report.date_from} to {report.date_to} ({report.timezone})</div>
      <ProductionTotals report={report} />
      <ProductionRows report={report} />
      <Pager page={report.page} count={report.count} size={report.page_size} change={value => setParams(previous => {
        const next = new URLSearchParams(previous); next.set('page', String(value)); return next;
      })} />
    </>}
    {printing && report && <PrintDocument title="Production" close={() => setPrinting(false)}>
      <h1>{me?.tenant.name}</h1><h2 className="ops-section-title">Production: original bound premiums</h2>
      <p>Binding dates: {report.date_from} to {report.date_to} ({report.timezone})</p>
      <p>{scope.join('; ')}</p><p>Page {report.page} of {Math.max(1, Math.ceil(report.count / report.page_size))}</p>
      <ProductionTotals report={report} /><h2 className="ops-section-title">{report.view === 'summary' ? groupLabels[report.group_by] : 'Policies'}</h2>
      <ProductionRows report={report} print />
    </PrintDocument>}
  </Surface>;
}

function ProductionTotals({ report }: { report: ProductionReport }) {
  return <section data-testid="production-totals"><h3 className="ops-subsection-title">Period totals</h3>
    <Grid headers={totalColumns} empty={!report.totals.length}>{report.totals.map(row => <tr key={row.currency}>
      {totalValues(row).map((value, i) => <td key={i} className="tabular-nums">{value}</td>)}
    </tr>)}</Grid></section>;
}

function ProductionRows({ report, print = false }: { report: ProductionReport; print?: boolean }) {
  if (report.view === 'policies') return <Grid headers={policyColumns} empty={!report.results.length}>{report.results.map(row => <tr key={row.id}>
    <td>{print ? row.policy_no : <Link className="ops-link" to={`/policies/list/${row.id}`}>{row.policy_no}</Link>}</td>
    {policyValues(row).slice(1).map((value, i) => <td key={i}>{value}</td>)}
  </tr>)}</Grid>;
  return <Grid headers={[groupLabels[report.group_by], ...totalColumns, 'Premium mix %']} empty={!report.results.length}>
    {report.results.map(row => <tr key={`${row.bucket}:${row.currency}`}><td>{row.label}</td>
      {totalValues(row).map((value, i) => <td key={i} className="tabular-nums">{value}</td>)}<td>{row.premium_share}%</td>
    </tr>)}
  </Grid>;
}
