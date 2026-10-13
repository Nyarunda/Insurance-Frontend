import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useOperationsQuery } from '../operations/data';
import { Grid, Pager, pretty, QueryState, Refresh, Surface, Tabs } from '../operations/ui';
import { downloadCsv } from '../operations/export';
import { PrintDocument } from '../operations/PrintDocument';
import { amountOf, cents } from '../operations/money';

const views = { journals: 'Posted journals', trial_balance: 'Trial balance', ledger: 'Account ledger', cashbook: 'Bank & cash book' };
type View = keyof typeof views;
interface Row {
  id: string; posting_id?: string; posting_date?: string; description?: string; branch?: string;
  currency: string; debit: string; credit: string; code?: string; name?: string; kind?: string;
  receipt_no?: string; source_action?: string; opening?: string; closing_debit?: string;
  closing_credit?: string; running_balance?: string; memo?: string;
}
interface Report {
  view: View; results: Row[]; totals: Row[]; count: number; page: number; page_size: number;
  date_from: string; date_to: string;
}
interface Options {
  accounts: { id: string; code: string; name: string; currency: string; kind: string }[];
  branches: { id: string; name: string }[];
}
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const columns = (view: View) => view === 'journals'
  ? ['Posted on', 'Journal', 'Branch', 'Currency', 'Debit', 'Credit', 'Action']
  : view === 'trial_balance' ? ['Account', 'Name', 'Currency', 'Opening (Dr - Cr)', 'Period debit', 'Period credit', 'Closing debit', 'Closing credit']
  : ['Posted on', 'Account', 'Journal', 'Branch', 'Currency', 'Debit', 'Credit', 'Account balance (Dr - Cr)', 'Memo'];
const reference = (r: Row) => r.receipt_no || r.description || 'Posted journal';
const values = (view: View, r: Row) => view === 'journals'
  ? [r.posting_date, reference(r), r.branch || 'Tenant-wide', r.currency, r.debit, r.credit, pretty(r.source_action || '')]
  : view === 'trial_balance' ? [r.code, r.name, r.currency, r.opening, r.debit, r.credit, r.closing_debit, r.closing_credit]
  : [r.posting_date, `${r.code} - ${r.name}`, reference(r), r.branch || 'Tenant-wide', r.currency, r.debit, r.credit, r.running_balance, r.memo];
const totalColumns = ['Currency', 'Opening (Dr - Cr)', 'Period debit', 'Period credit', 'Closing debit', 'Closing credit'];
const totalValues = (r: Row) => [r.currency, r.opening, r.debit, r.credit, r.closing_debit, r.closing_credit];

export function FinanceLedgerPage() {
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') in views ? params.get('view') : 'journals') as View;
  const now = new Date();
  const applied = { date_from: params.get('date_from') ?? localDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    date_to: params.get('date_to') ?? localDate(now), account_id: params.get('account_id') ?? '',
    branch_id: params.get('branch_id') ?? '', currency: params.get('currency') ?? '' };
  const [draft, setDraft] = useState(applied);
  const [printing, setPrinting] = useState(false);
  useEffect(() => setDraft(applied), [params]);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const filters = new URLSearchParams({ ...applied, view, page: String(page) });
  for (const key of ['account_id', 'branch_id']) if (!filters.get(key)) filters.delete(key);
  const query = useOperationsQuery<Report>(`/billing/ledger?${filters}`);
  const options = useOperationsQuery<Options>('/billing/ledger/options');
  const report = query.isError ? undefined : query.data;
  const account = options.data?.accounts.find(a => a.id === applied.account_id);
  const branch = options.data?.branches.find(b => b.id === applied.branch_id);
  const scope = `${applied.account_id ? account ? `${account.code} - ${account.name}` : 'Selected account' : 'All visible accounts'}; ${applied.branch_id ? branch?.name || 'Selected branch' : 'All permitted branches'}; ${applied.currency || 'Separate currency totals'}`;
  const exportPage = () => {
    if (!report) return;
    downloadCsv(`finance-${view}-${report.date_from}-page-${page}.csv`, [
      [views[view], 'Posted billing journal only'], ['From', report.date_from, 'To', report.date_to],
      ['Scope', scope], ['Page', report.page, 'Total rows', report.count], columns(view),
      ...report.results.map(r => values(view, r).map(v => v ?? '')), [],
      ['Full filtered account totals'], totalColumns, ...report.totals.map(r => totalValues(r).map(v => v ?? '')),
    ]);
  };
  const rows = (print = false) => report && <Grid headers={columns(view)} empty={!report.results.length}>
    {report.results.map(r => <tr key={r.id}>{values(view, r).map((value, i) => <td key={i} className="tabular-nums">
      {!print && view === 'trial_balance' && i === 0
        ? <Link className="ops-link" to={`/billing/ledger?${new URLSearchParams({ ...applied, view: 'ledger', account_id: r.id })}`}>{value}</Link>
        : !print && ((view === 'journals' && i === 1) || (['ledger', 'cashbook'].includes(view) && i === 2))
          ? <Link className="ops-link" to={`/billing/journals/${r.posting_id ?? r.id}`}>{value}</Link> : value || '-'}
    </td>)}</tr>)}
  </Grid>;
  const totals = report && <section data-testid="ledger-totals"><h2 className="ops-section-title">Filtered account totals</h2>
    <Grid headers={totalColumns} empty={!report.totals.length}>{report.totals.map(r => <tr key={r.currency}>{totalValues(r).map((v, i) => <td key={i} className="tabular-nums">{v}</td>)}</tr>)}</Grid></section>;
  return <Surface title="Finance ledger" subtitle="Posted billing journal" actions={<><Refresh query={query} />
    <button className="hz-button hz-button-secondary" disabled={!report || query.isFetching} onClick={exportPage}><Download size={15} />Export page</button>
    <button className="hz-icon-button" title="Print ledger page" disabled={!report || query.isFetching} onClick={() => setPrinting(true)}><Printer size={16} /></button></>}>
    <Tabs value={view} options={Object.entries(views).map(([value, label]) => ({ value, label }))} change={v => setParams({ ...applied, view: v })} />
    <form className="ops-toolbar" onSubmit={e => { e.preventDefault(); setParams({ ...draft, view }); }}>
      <label>From <input className="hz-field p-2" aria-label="Ledger date from" type="date" required value={draft.date_from} onChange={e => setDraft(d => ({ ...d, date_from: e.target.value }))} /></label>
      <label>To <input className="hz-field p-2" aria-label="Ledger date to" type="date" required value={draft.date_to} onChange={e => setDraft(d => ({ ...d, date_to: e.target.value }))} /></label>
      <label>Account <select className="hz-field p-2" aria-label="Ledger account" value={draft.account_id} onChange={e => setDraft(d => ({ ...d, account_id: e.target.value }))}>
        <option value="">All visible accounts</option>{options.data?.accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.currency})</option>)}
      </select></label>
      <label>Branch <select className="hz-field p-2" aria-label="Ledger branch" value={draft.branch_id} onChange={e => setDraft(d => ({ ...d, branch_id: e.target.value }))}>
        <option value="">All permitted branches</option>{options.data?.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select></label>
      <label>Currency <input className="hz-field p-2 ops-currency" aria-label="Ledger currency" maxLength={3} pattern="[A-Z]{3}" value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value.toUpperCase() }))} /></label>
      <button className="hz-button hz-button-primary">Run report</button>
    </form>
    <QueryState query={options} /><QueryState query={query} />
    {view === 'cashbook' && <p className="ops-muted">Posted bank, cash and M-Pesa clearing movements. These are book balances, not confirmed bank balances or reconciled statements.</p>}
    {report && <><p className="ops-muted">{report.date_from} to {report.date_to} | {scope}</p>{totals}<h2 className="ops-section-title">{views[view]}</h2>{rows()}
      <Pager page={report.page} count={report.count} size={report.page_size} change={p => setParams({ ...applied, view, page: String(p) })} /></>}
    {printing && report && <PrintDocument title={views[view]} close={() => setPrinting(false)}><h1>{views[view]}</h1>
      <p>Posted billing journal | {report.date_from} to {report.date_to}</p><p>{scope}</p><p>Page {report.page}; {report.count} rows</p>{totals}{rows(true)}</PrintDocument>}
  </Surface>;
}

interface Journal {
  id: string; posting_date: string; currency: string; description: string; branch: string | null;
  source_type: string; source_action: string; receipt_no: string | null; receipt_id: string | null;
  lines: { line_no: number; account_id: string; code: string; name: string; debit: string; credit: string; memo: string }[];
}
export function FinanceJournalWorkspace() {
  const { postingId } = useParams();
  const navigate = useNavigate();
  const query = useOperationsQuery<Journal>(`/billing/journals/${postingId}`);
  const row = query.isError ? undefined : query.data;
  return <Surface title={row?.receipt_no || 'Posted journal'} back={() => navigate('/billing/ledger')} actions={<Refresh query={query} />}>
    <QueryState query={query} />{row && <><dl className="ops-summary"><div><dt>Posted on</dt><dd>{row.posting_date}</dd></div>
      <div><dt>Description</dt><dd>{row.description}</dd></div><div><dt>Branch</dt><dd>{row.branch || 'Tenant-wide'}</dd></div>
      <div><dt>Source</dt><dd>{pretty(row.source_type)} | {pretty(row.source_action)}</dd></div></dl>
      {row.receipt_id && <Link className="ops-link" to={`/billing/receipts/list/${row.receipt_id}`}>Open {row.receipt_no}</Link>}
      <Grid headers={['Account', 'Name', 'Debit', 'Credit', 'Memo']}>{row.lines.map(l => <tr key={l.line_no}>
        <td><Link className="ops-link" to={`/billing/ledger?${new URLSearchParams({ view: 'ledger', account_id: l.account_id, date_from: row.posting_date, date_to: row.posting_date })}`}>{l.code}</Link></td>
        <td>{l.name}</td><td>{row.currency} {l.debit}</td><td>{row.currency} {l.credit}</td><td>{l.memo}</td>
      </tr>)}<tr><th colSpan={2}>Total</th><td>{row.currency} {amountOf(row.lines.reduce((s, l) => s + (cents(l.debit) ?? 0n), 0n))}</td><td>{row.currency} {amountOf(row.lines.reduce((s, l) => s + (cents(l.credit) ?? 0n), 0n))}</td><td /></tr></Grid>
    </>}
  </Surface>;
}
