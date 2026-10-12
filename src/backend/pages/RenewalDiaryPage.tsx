import React, { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMe } from '../../lib/auth/me';
import { useOperationsQuery } from '../operations/data';
import { downloadCsv } from '../operations/export';
import { PrintDocument } from '../operations/PrintDocument';
import { Grid, Pager, pretty, QueryState, Refresh, Surface } from '../operations/ui';

interface DiaryRow {
  id: string; policy_no: string; customer: string; product: string; insurer: string; branch: string;
  expiry_date: string; days_to_expiry: number; currency: string; expiring_premium: string;
  renewal_id: string | null; renewal_no: string | null; renewal_status: string; renewal_stale: boolean;
}
interface DiaryTotal { currency: string; policy_count: number; in_progress: number; expired_count: number; expiring_premium: string }
interface Diary { results: DiaryRow[]; totals: DiaryTotal[]; count: number; page: number; page_size: number; date_from: string; date_to: string; as_of: string }
interface NamedOption { id: string; name: string }
interface DiaryOptions { branches: NamedOption[]; products: NamedOption[]; insurers: NamedOption[] }
const date = (day: Date) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
const columns = ['Policy', 'Customer', 'Product', 'Insurer', 'Branch', 'Expiry date', 'Days to expiry', 'Currency', 'Expiring annual premium', 'Renewal', 'Status'];
const totalColumns = ['Currency', 'Policies', 'Open renewals', 'Expired policies', 'Expiring annual premium'];
const status = (row: DiaryRow) => `${row.renewal_status === 'EXPIRED' ? 'Offer expired' : pretty(row.renewal_status)}${row.renewal_stale ? ' (needs refresh)' : ''}`;
const values = (row: DiaryRow) => [row.policy_no, row.customer, row.product, row.insurer, row.branch, row.expiry_date, row.days_to_expiry, row.currency, row.expiring_premium, row.renewal_no ?? '', status(row)];
const totals = (row: DiaryTotal) => [row.currency, row.policy_count, row.in_progress, row.expired_count, row.expiring_premium];

export function RenewalDiaryPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const now = new Date();
  const end = new Date(now); end.setDate(end.getDate() + 90);
  const applied = { date_from: params.get('date_from') ?? date(now), date_to: params.get('date_to') ?? date(end),
    branch_id: params.get('branch_id') ?? '', product_id: params.get('product_id') ?? '', insurer_id: params.get('insurer_id') ?? '',
    currency: params.get('currency') ?? '', work_status: params.get('work_status') ?? '' };
  const [draft, setDraft] = useState(applied);
  const [validation, setValidation] = useState('');
  const [printing, setPrinting] = useState(false);
  useEffect(() => { setDraft(applied); setValidation(''); }, [params]);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const filters = new URLSearchParams({ ...applied, page: String(page), page_size: '25' });
  for (const field of ['branch_id', 'product_id', 'insurer_id']) if (!filters.get(field)) filters.delete(field);
  const query = useOperationsQuery<Diary>(`/policies/reports/renewal-diary?${filters}`);
  const options = useOperationsQuery<DiaryOptions>('/policies/reports/renewal-diary/options');
  const report = query.isError ? undefined : query.data;
  const me = useMe().data;
  const filterLabel = (key: keyof DiaryOptions, id: string) => id ? options.data?.[key].find(row => row.id === id)?.name ?? id : `All permitted ${key}`;
  const scope = [filterLabel('branches', applied.branch_id), filterLabel('products', applied.product_id), filterLabel('insurers', applied.insurer_id),
    applied.currency || 'All currencies', applied.work_status === 'NONE' ? 'No open renewal' : applied.work_status === 'OPEN' ? 'Open renewals' : 'All renewal work'];
  return <Surface title="Renewal diary" subtitle="Latest policy expiry dates" back={() => navigate('/renewals/list')} actions={<>
    <Refresh query={query} />
    <button className="hz-button hz-button-secondary" data-testid="diary-export" disabled={!report || query.isFetching} onClick={() => {
      if (!report) return;
      downloadCsv(`renewal-diary-${report.date_from}-${report.date_to}-page-${report.page}.csv`, [
        ['Renewal diary', me?.tenant.name ?? ''], ['As of', report.as_of, 'Date basis', 'Latest policy version expiry'],
        ['Expiry from', report.date_from, 'Expiry to', report.date_to], ['Scope', ...scope],
        ['Page', report.page, 'Total policies', report.count], columns, ...report.results.map(values), [],
        ['Full filtered totals', ...totalColumns], ...report.totals.map(row => ['Total', ...totals(row)]),
      ]);
    }}><Download size={15} />Export page</button>
    <button className="hz-icon-button" title="Print renewal diary page" disabled={!report || query.isFetching} onClick={() => setPrinting(true)}><Printer size={16} /></button>
  </>}>
    <form className="ops-toolbar" onSubmit={e => {
      e.preventDefault();
      if (draft.date_from > draft.date_to || (Date.parse(draft.date_to) - Date.parse(draft.date_from)) / 86400000 > 365) {
        setValidation('Choose an expiry-date range of at most 366 days.'); return;
      }
      setValidation(''); setParams(new URLSearchParams(draft));
    }}>
      <label>Expiry from <input className="hz-field p-2" type="date" required value={draft.date_from} onChange={e => setDraft(v => ({ ...v, date_from: e.target.value }))} /></label>
      <label>Expiry to <input className="hz-field p-2" type="date" required value={draft.date_to} onChange={e => setDraft(v => ({ ...v, date_to: e.target.value }))} /></label>
      {([['branch_id', 'branches', 'Branch'], ['product_id', 'products', 'Product'], ['insurer_id', 'insurers', 'Insurer']] as const).map(([field, key, label]) =>
        <label key={field}>{label} <select className="hz-field p-2" value={draft[field]} disabled={!options.data} onChange={e => setDraft(v => ({ ...v, [field]: e.target.value }))}>
          <option value="">All permitted {key}</option>{options.data?.[key].map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select></label>)}
      <label>Renewal work <select className="hz-field p-2" value={draft.work_status} onChange={e => setDraft(v => ({ ...v, work_status: e.target.value }))}>
        <option value="">All</option><option value="NONE">No open renewal</option><option value="OPEN">Open renewals</option>
      </select></label>
      <label>Currency <input className="hz-field p-2 ops-currency" placeholder="All" pattern="[A-Z]{3}" maxLength={3} value={draft.currency} onChange={e => setDraft(v => ({ ...v, currency: e.target.value.toUpperCase() }))} /></label>
      <button className="hz-button hz-button-primary">Run report</button>
    </form>
    {validation && <p role="alert">{validation}</p>}<QueryState query={options} /><QueryState query={query} />
    {report && <><div className="ops-muted">As of {report.as_of}; expiry dates {report.date_from} to {report.date_to}</div>
      <DiaryTotals report={report} /><h2 className="ops-section-title">Policies</h2><DiaryRows report={report} />
      <Pager page={report.page} count={report.count} size={report.page_size} change={value => setParams(previous => {
        const next = new URLSearchParams(previous); next.set('page', String(value)); return next;
      })} />
    </>}
    {printing && report && <PrintDocument title="Renewal diary" close={() => setPrinting(false)}>
      <h1>{me?.tenant.name}</h1><h2 className="ops-section-title">Renewal diary</h2>
      <p>As of {report.as_of}; latest expiry dates {report.date_from} to {report.date_to}</p><p>{scope.join('; ')}</p>
      <p>Page {report.page} of {Math.max(1, Math.ceil(report.count / report.page_size))}</p>
      <DiaryTotals report={report} /><h2 className="ops-section-title">Policies</h2><DiaryRows report={report} print />
    </PrintDocument>}
  </Surface>;
}
function DiaryTotals({ report }: { report: Diary }) {
  return <section data-testid="diary-totals"><h2 className="ops-section-title">Period totals</h2>
    <Grid headers={totalColumns} empty={!report.totals.length}>{report.totals.map(row => <tr key={row.currency}>
      {totals(row).map((value, i) => <td key={i} className="tabular-nums">{value}</td>)}
    </tr>)}</Grid></section>;
}
function DiaryRows({ report, print = false }: { report: Diary; print?: boolean }) {
  return <Grid headers={columns} empty={!report.results.length}>{report.results.map(row => <tr key={row.id}>
    <td>{print ? row.policy_no : <Link className="ops-link" to={`/policies/list/${row.id}?tab=renewals`}>{row.policy_no}</Link>}</td>
    {values(row).slice(1, 9).map((value, i) => <td key={i}>{value}</td>)}
    <td>{row.renewal_id && !print ? <Link className="ops-link" to={`/policies/list/${row.id}/renewals/${row.renewal_id}`}>{row.renewal_no}</Link> : row.renewal_no ?? ''}</td>
    <td>{status(row)}</td>
  </tr>)}</Grid>;
}
