import React, { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { useMe } from '../../lib/auth/me';
import { useOperationsQuery } from '../operations/data';
import { downloadCsv } from '../operations/export';
import { PrintDocument } from '../operations/PrintDocument';
import { Grid, Pager, pretty, QueryState, Refresh, Surface, Tabs } from '../operations/ui';

interface CollectionTotal { currency: string; receipt_count: number; reversal_count: number; gross: string; reversed: string; net: string }
interface CollectionRow extends CollectionTotal { bucket: string; label: string }
export interface CollectionsReport {
  results: CollectionRow[]; totals: CollectionTotal[]; count: number; page: number; page_size: number;
  date_from: string; date_to: string; date_basis: string; group_by: string;
}
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const groups: Record<string, string> = { day: 'Posting date', branch: 'Branch', payment_method: 'Payment method' };
const rowLabel = (row: CollectionRow, group: string) => group === 'payment_method' ? pretty(row.label) : row.label;
const values = (r: CollectionTotal) => [r.currency, r.receipt_count, r.reversal_count, r.gross, r.reversed, r.net];
const columns = ['Currency', 'Receipts', 'Reversals', 'Gross collections', 'Reversed amount', 'Net collections'];

export function CollectionsReportPage() {
  const [params, setParams] = useSearchParams();
  const today = new Date();
  const initial = {
    date_from: params.get('date_from') ?? localDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    date_to: params.get('date_to') ?? localDate(today), group_by: params.get('group_by') ?? 'day',
    currency: params.get('currency') ?? '', branch_id: params.get('branch_id') ?? '',
  };
  const [draft, setDraft] = useState(initial);
  useEffect(() => { setDraft(initial); }, [params]);
  const [validation, setValidation] = useState('');
  const [print, setPrint] = useState(false);
  const colTab = params.get('view') || 'breakdown';
  const me = useMe().data;
  const scopeLabel = initial.branch_id ? me?.branches.find(b => b.id === initial.branch_id)?.name ?? 'Selected branch' : 'All permitted branches';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const filters = new URLSearchParams({ ...initial, page: String(page), page_size: '25' });
  if (!initial.branch_id) filters.delete('branch_id');
  const query = useOperationsQuery<CollectionsReport>(`/billing/reports/collections?${filters}`);
  const report = query.data;
  const exportPage = () => {
    if (!report) return;
    downloadCsv(`premium-collections-${report.date_from}-${report.date_to}-page-${page}.csv`, [
      ['Premium collections', me?.tenant.name ?? ''],
      ['Posting date from', report.date_from, 'Posting date to', report.date_to],
      ['Branch scope', scopeLabel, 'Currency filter', initial.currency || 'All currencies'],
      ['Page', report.page, 'Total groups', report.count],
      [groups[report.group_by], ...columns],
      ...report.results.map(row => [rowLabel(row, report.group_by), ...values(row)]),
      [], ['Full filtered totals', ...columns], ...report.totals.map(row => ['Total', ...values(row)]),
    ]);
  };
  return <Surface title="Premium collections" subtitle="Posted receipts and reversals" actions={<>
    <Refresh query={query} />
    <button className="hz-button hz-button-secondary" data-testid="collections-export" disabled={!report || query.isFetching || query.isError} onClick={exportPage}><Download size={15} />Export page</button>
    <button className="hz-icon-button" title="Print report page" disabled={!report || query.isFetching || query.isError} onClick={() => setPrint(true)}><Printer size={16} /></button>
  </>}>
    <form className="ops-toolbar" data-testid="collections-filters" onSubmit={e => {
      e.preventDefault();
      if (draft.date_from > draft.date_to || (Date.parse(draft.date_to) - Date.parse(draft.date_from)) / 86400000 > 365) {
        setValidation('Choose a posting-date range of at most 366 days.'); return;
      }
      setValidation(''); setParams(new URLSearchParams(draft));
    }}>
      <label>From <input className="hz-field p-2" aria-label="Posting date from" type="date" required value={draft.date_from} onChange={e => setDraft(v => ({ ...v, date_from: e.target.value }))} /></label>
      <label>To <input className="hz-field p-2" aria-label="Posting date to" type="date" required value={draft.date_to} onChange={e => setDraft(v => ({ ...v, date_to: e.target.value }))} /></label>
      <select className="hz-field p-2" aria-label="Group collections by" value={draft.group_by} onChange={e => setDraft(v => ({ ...v, group_by: e.target.value }))}>
        {Object.entries(groups).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select className="hz-field p-2" aria-label="Report branch" value={draft.branch_id} onChange={e => setDraft(v => ({ ...v, branch_id: e.target.value }))}>
        <option value="">All permitted branches</option>{me?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <label>Currency <input className="hz-field p-2 ops-currency" aria-label="Report currency" placeholder="All" pattern="[A-Z]{3}" maxLength={3} value={draft.currency} onChange={e => setDraft(v => ({ ...v, currency: e.target.value.toUpperCase() }))} /></label>
      <button className="hz-button hz-button-primary" type="submit">Run report</button>
    </form>
    {validation && <p role="alert">{validation}</p>}
    <QueryState query={query} />
    {report && <>
      <Tabs value={colTab} options={[{ value: 'breakdown', label: groups[report.group_by] }, { value: 'totals', label: 'Period totals' }]} change={v => setParams(p => { const n = new URLSearchParams(p); n.set('view', v); return n; })} />
      {colTab === 'totals' && <CollectionTotals report={report} />}
      {colTab === 'breakdown' && <>
        <CollectionRows report={report} />
        <Pager page={page} count={report.count} size={25} change={p => setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(p)); return next; })} />
      </>}
    </>}
    {print && report && <PrintDocument title="Premium collections" close={() => setPrint(false)}>
      <h1>{me?.tenant.name}</h1><h2 className="ops-section-title">Premium collections</h2>
      <p>Posting dates: {report.date_from} to {report.date_to}</p><p>Page {report.page} of {Math.max(1, Math.ceil(report.count / report.page_size))}</p>
      <p>{scopeLabel}; {initial.currency || 'All currencies'}</p>
      <CollectionTotals report={report} /><h2 className="ops-section-title">{groups[report.group_by]}</h2><CollectionRows report={report} />
    </PrintDocument>}
  </Surface>;
}

function CollectionTotals({ report }: { report: CollectionsReport }) {
  return <section data-testid="collections-totals">
    <Grid headers={columns} empty={!report.totals.length}>{report.totals.map(row => <tr key={row.currency}>
      {values(row).map((value, i) => <td key={i} className="tabular-nums">{value}</td>)}
    </tr>)}</Grid></section>;
}
function CollectionRows({ report }: { report: CollectionsReport }) {
  return <Grid headers={[groups[report.group_by], ...columns]} empty={!report.results.length}>
    {report.results.map(row => <tr key={`${row.bucket}:${row.currency}`}><td>{rowLabel(row, report.group_by)}</td>
      {values(row).map((value, i) => <td key={i} className="tabular-nums">{value}</td>)}
    </tr>)}
  </Grid>;
}
