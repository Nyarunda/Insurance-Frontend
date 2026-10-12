import React, { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Pencil, Plus, Printer, Save, Trash2, Undo2 } from 'lucide-react';
import { useMe, usePermission } from '../../lib/auth/me';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { ActionDialog, ActionSpec, Grid, Pager, pretty, QueryState, reason, Refresh, SearchBox, Status, Surface, Tabs } from '../operations/ui';
import { BillingAccount, PageResult, Receipt, ReceiptPolicy, useOperationsCommand, useOperationsQuery } from '../operations/data';
import { amountOf, cents } from '../operations/money';
import { PrintDocument } from '../operations/PrintDocument';

export function BillingAccountsPage() {
  const accounts = useOperationsQuery<{ results: BillingAccount[] }>('/billing/accounts');
  const kinds = useOperationsQuery<{ code: string; name: string }[]>('/billing/account-kinds');
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [filter, setFilter] = useState('');
  const [notice, setNotice] = useState('');
  const rows = accounts.data?.results.filter(a => `${a.code} ${a.name} ${a.kind}`.toLowerCase().includes(filter.toLowerCase()));
  return <Surface title="Billing accounts" actions={<><Refresh query={accounts} /><button className="hz-button hz-button-primary" disabled={!kinds.data} onClick={() => setAction({ title: 'New billing account', path: '/billing/accounts', fields: [{ name: 'code', label: 'Code', required: true, maxLength: 32 }, { name: 'name', label: 'Name', required: true }, { name: 'kind', label: 'Account kind', required: true, options: kinds.data!.map(k => ({ value: k.code, label: k.name })) }, { name: 'currency', label: 'Currency', value: 'KES', maxLength: 3, required: true }, { name: 'external_mapping', label: 'External account mapping', maxLength: 128 }], transform: v => ({ ...v, currency: v.currency.toUpperCase() }) })}><Plus size={15} />New account</button></>}>
    {notice && <div role="status" className="ops-notice">{notice}</div>}<QueryState query={accounts} /><QueryState query={kinds} />
    <div className="ops-toolbar"><SearchBox value={filter} label="Search accounts" onSearch={setFilter} /></div>
    {rows && <Grid headers={['Code', 'Name', 'Kind', 'Currency', 'External mapping', 'Status', '']} empty={!rows.length}>{rows.map(a => <tr key={a.id}><td>{a.code}</td><td>{a.name}</td><td>{pretty(a.kind)}</td><td>{a.currency}</td><td>{a.external_mapping || '-'}</td><td><Status value={a.is_active ? 'ACTIVE' : 'INACTIVE'} /></td><td><button className="hz-icon-button" title={`Edit ${a.code}`} onClick={() => setAction({ title: `Edit ${a.code}`, path: `/billing/accounts/${a.id}`, method: 'PATCH', ifMatch: a.etag, fields: [{ name: 'name', label: 'Name', value: a.name, required: true }, { name: 'external_mapping', label: 'External account mapping', value: a.external_mapping, maxLength: 128 }, { name: 'is_active', label: 'Status', value: String(a.is_active), required: true, options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] }], transform: v => ({ ...v, is_active: v.is_active === 'true' }) })}><Pencil size={15} /></button></td></tr>)}</Grid>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => { setAction(null); setNotice('Account saved.'); }} />}
  </Surface>;
}

export function ReceiptsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const dateFrom = params.get('date_from') ?? '';
  const dateTo = params.get('date_to') ?? '';
  const filters = new URLSearchParams({ page: String(page), page_size: '25', status, q });
  if (dateFrom) filters.set('date_from', dateFrom);
  if (dateTo) filters.set('date_to', dateTo);
  const query = useOperationsQuery<PageResult<Receipt>>(`/billing/receipts?${filters}`);
  const create = usePermission('billing.receipt.create');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const update = (values: Record<string, string>) => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.delete('page');
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    return next;
  });
  return <Surface title="Receipts" actions={<>
    <Refresh query={query} />
    {create && <button data-testid="receipt-create" className="hz-button hz-button-primary" onClick={() => setOpen(true)}><Plus size={15} />Record receipt</button>}
  </>}>
    <div className="ops-toolbar" data-testid="receipt-filters">
      <SearchBox value={q} label="Search receipt, customer or reference" onSearch={value => update({ q: value })} />
      <select aria-label="Receipt status" className="hz-field p-2" value={status} onChange={e => update({ status: e.target.value })}>
        <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="REVERSED">Reversed</option>
      </select>
      <label>From <input aria-label="Payment date from" className="hz-field p-2" type="date" value={dateFrom} onChange={e => update({ date_from: e.target.value })} /></label>
      <label>To <input aria-label="Payment date to" className="hz-field p-2" type="date" value={dateTo} onChange={e => update({ date_to: e.target.value })} /></label>
    </div>
    <QueryState query={query} />
    {query.data && <>
      <Grid headers={['Receipt', 'Customer', 'Payment date', 'Method', 'Amount', 'Status']} empty={!query.data.results.length}>
        {query.data.results.map(r => <tr key={r.id}>
          <td><Link className="ops-link" to={`/billing/receipts/list/${r.id}`}>{r.receipt_no}</Link></td>
          <td>{r.customer_name}</td><td>{r.payment_date}</td><td>{pretty(r.payment_method)}</td>
          <td className="tabular-nums">{r.currency} {r.amount}</td><td><Status value={r.status} /></td>
        </tr>)}
      </Grid>
      <Pager page={page} count={query.data.count} size={25} change={p => update({ page: String(p) })} />
    </>}
    {open && <NewReceipt close={() => setOpen(false)} done={r => navigate(`/billing/receipts/list/${r.id}`)} />}
  </Surface>;
}

export function ReceiptWorkspace() {
  const { receiptId = '' } = useParams();
  const query = useOperationsQuery<Receipt>(`/billing/receipts/${encodeURIComponent(receiptId)}`);
  const reverse = usePermission('billing.receipt.reverse');
  const me = useMe().data;
  const actor = me?.user.id;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'details';
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [print, setPrint] = useState<Receipt | null>(null);
  const r = query.data;
  return <Surface title={r?.receipt_no ?? 'Receipt'} subtitle={r && <Status value={r.status} />} back={() => navigate('/billing/receipts/list')} actions={<><Refresh query={query} />
    <button className="hz-icon-button" title="Print receipt" data-testid="receipt-print" disabled={!r || query.isFetching} onClick={async () => { const fresh = await query.refetch(); if (fresh.isSuccess && fresh.data) setPrint(fresh.data); }}><Printer size={16} /></button>
    {r && reverse && r.status === 'ACTIVE' && !r.reversal_of_receipt_id && r.created_by !== actor && <button className="hz-button hz-button-secondary" onClick={() => setAction({ title: `Reverse ${r.receipt_no}`, path: `/billing/receipts/${r.id}/reverse`, fields: [reason], confirm: 'Reverse receipt', message: `The full ${r.currency} ${r.amount} will be reversed. The original receipt and allocations remain in the audit history.` })}><Undo2 size={15} />Reverse receipt</button>}</>}>
    <QueryState query={query} />
    {r && <>
      <dl className="ops-summary">
        <div><dt>Customer</dt><dd>{r.customer_name}</dd></div>
        <div><dt>Amount</dt><dd className="tabular-nums">{r.currency} {r.amount}</dd></div>
        <div><dt>Payment date</dt><dd>{r.payment_date}</dd></div>
        <div><dt>Method</dt><dd>{pretty(r.payment_method)}</dd></div>
        <div><dt>Reference</dt><dd>{r.payment_reference || '-'}</dd></div>
        {r.reversal_reason && <div><dt>Reversal reason</dt><dd>{r.reversal_reason}</dd></div>}
      </dl>
      <Tabs value={tab} options={[{ value: 'details', label: 'Allocations' }, { value: 'journal', label: 'Journal entries' }]} change={v => setParams({ tab: v })} />
      {tab === 'details' && <Grid headers={['Policy', 'Amount']} empty={!r.allocations.length}>
        {r.allocations.map(a => <tr key={a.id}><td>{a.policy_no}</td><td className="tabular-nums">{r.currency} {a.amount}</td></tr>)}
      </Grid>}
      {tab === 'journal' && <ReceiptJournal receiptId={receiptId} />}
    </>}
    {print && <PrintDocument title={print.reversal_of_receipt_id ? 'Receipt reversal' : 'Premium receipt'} close={() => setPrint(null)}>
      <h1>{me?.tenant.name}</h1>
      <h2 className="ops-section-title">{print.reversal_of_receipt_id ? 'Receipt reversal' : 'Premium receipt'}: {print.receipt_no}</h2>
      <p><strong>{print.reversal_of_receipt_id ? 'Reversal entry' : pretty(print.status)}</strong></p>
      <dl className="ops-summary">
        <div><dt>Customer</dt><dd>{print.customer_name}</dd></div>
        <div><dt>Amount</dt><dd>{print.currency} {print.amount}</dd></div>
        <div><dt>Payment date</dt><dd>{print.payment_date}</dd></div>
        <div><dt>Method</dt><dd>{pretty(print.payment_method)}</dd></div>
        <div><dt>Payment reference</dt><dd>{print.payment_reference || '-'}</dd></div>
        {print.reversal_reason && <div><dt>Reversal reason</dt><dd>{print.reversal_reason}</dd></div>}
      </dl>
      <h2 className="ops-section-title">Policy allocations</h2>
      <Grid headers={['Policy', 'Currency', 'Amount']} empty={!print.allocations.length}>
        {print.allocations.map(a => <tr key={a.id}><td>{a.policy_no}</td><td>{print.currency}</td><td>{a.amount}</td></tr>)}
      </Grid>
    </PrintDocument>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={data => { setAction(null); navigate(`/billing/receipts/list/${(data as Receipt).id}`); }} />}
  </Surface>;
}

interface Journal {
  posting_date: string; description: string; currency: string; action: string;
  total_debit: string; total_credit: string;
  lines: { line_no: number; account_code: string; account_name: string; debit: string; credit: string; memo: string }[];
}

export function ReceiptJournal({ receiptId }: { receiptId: string }) {
  const query = useOperationsQuery<Journal>(`/billing/receipts/${encodeURIComponent(receiptId)}/journal`);
  const journal = query.data;
  return <section data-testid="receipt-journal">
    <QueryState query={query} />
    {journal && <>
      <div className="ops-journal-header">
        <span>{journal.posting_date}</span>
        <span className="ops-journal-sep" />
        <span>{pretty(journal.action)}</span>
        <span className="ops-journal-sep" />
        <span>{journal.description}</span>
      </div>
      <Grid headers={['Account', 'Name', 'Debit', 'Credit', 'Memo']} empty={!journal.lines.length}>
        {journal.lines.map(line => <tr key={line.line_no}>
          <td>{line.account_code}</td><td>{line.account_name}</td>
          <td className="tabular-nums">{journal.currency} {line.debit}</td>
          <td className="tabular-nums">{journal.currency} {line.credit}</td><td>{line.memo}</td>
        </tr>)}
        <tr><th scope="row" colSpan={2}>Total</th><td className="tabular-nums">{journal.currency} {journal.total_debit}</td><td className="tabular-nums">{journal.currency} {journal.total_credit}</td><td /></tr>
      </Grid>
    </>}
  </section>;
}

const methodKind: Record<string, string> = { CASH: 'CASH', BANK_TRANSFER: 'BANK', CHEQUE: 'BANK', MPESA: 'MPESA_CLEARING' };
export function NewReceipt({ close, done }: { close: () => void; done: (receipt: Receipt) => void }) {
  const command = useOperationsCommand();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const policies = useOperationsQuery<PageResult<ReceiptPolicy>>(`/billing/receipt-options/policies?${new URLSearchParams({ q, page: String(page) })}`);
  const accounts = useOperationsQuery<{ results: BillingAccount[] }>('/billing/receipt-options/accounts');
  const [selected, setSelected] = useState<{ policy: ReceiptPolicy; amount: string }[]>([]);
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [debit, setDebit] = useState('');
  const [receivable, setReceivable] = useState('');
  const [date, setDate] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [validation, setValidation] = useState('');
  const first = selected[0]?.policy;
  const creditAccounts = accounts.data?.results.filter(a => a.kind === 'CLIENT_RECEIVABLE' && a.currency === first?.currency) ?? [];
  const debitAccounts = accounts.data?.results.filter(a => a.kind === methodKind[method] && a.currency === first?.currency) ?? [];
  const total = selected.reduce((sum, s) => sum + (cents(s.amount) ?? 0n), 0n);
  const same = (p: ReceiptPolicy) => !first || (p.customer_id === first.customer_id && p.branch_id === first.branch_id && p.currency === first.currency);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = cents(amount);
    const allocations = selected.map(s => ({ policy_id: s.policy.id, amount: cents(s.amount), account_id: receivable }));
    if (!first || parsed === null || parsed <= 0n || allocations.some(a => a.amount === null || a.amount <= 0n) || total !== parsed) {
      setValidation('Allocate the full receipt amount across one or more policies for the same customer, branch and currency.');
      return;
    }
    if (!debitAccounts.some(a => a.id === debit) || !creditAccounts.some(a => a.id === receivable)) { setValidation('Choose active payment and receivable accounts in the receipt currency.'); return; }
    setValidation('');
    const result = await command.run<Receipt>('/billing/receipts', { customer_id: first.customer_id, branch_id: first.branch_id, currency: first.currency, amount: amountOf(parsed), payment_method: method, payment_reference: reference.trim(), payment_date: date, debit_account_id: debit, allocations: allocations.map(a => ({ ...a, amount: amountOf(a.amount!) })) });
    if (result) done(result);
  };
  return <DialogFrame titleId="record-receipt" title="Record receipt" size="xl" dismissOnBackdrop={false} onClose={() => { if (!command.pending) close(); }} footer={<><button className="hz-button hz-button-secondary" disabled={command.pending} onClick={close}>Cancel</button><button form="receipt-form" className="hz-button hz-button-primary" disabled={command.pending || !selected.length || !accounts.data}><Save size={14} />{command.pending ? 'Posting...' : 'Post receipt'}</button></>}>
    <div className="ops"><QueryState query={policies} /><QueryState query={accounts} />{command.error != null && <ApiErrorAlert error={command.error} />}{validation && <p role="alert" className="text-red-700 py-2">{validation}</p>}
      <div className="ops-toolbar"><SearchBox value={q} label="Find policy or customer" onSearch={v => { setQ(v); setPage(1); }} /></div>
      {policies.data && <><Grid headers={['Policy', 'Customer', 'Branch', 'Currency', '']} empty={!policies.data.results.length}>{policies.data.results.map(p => <tr key={p.id}><td>{p.policy_no}</td><td>{p.customer_name}</td><td>{p.branch_name}</td><td>{p.currency}</td><td><button className="hz-icon-button" title={`Allocate to ${p.policy_no}`} disabled={command.pending || !same(p) || selected.some(s => s.policy.id === p.id)} onClick={() => setSelected(v => [...v, { policy: p, amount: '' }])}><Plus size={15} /></button></td></tr>)}</Grid><Pager page={page} count={policies.data.count} size={25} change={setPage} /></>}
      <form id="receipt-form" className="ops-form" onSubmit={e => void submit(e)}><fieldset disabled={command.pending}><label>Receipt amount *<input className="hz-field" inputMode="decimal" required value={amount} onChange={e => setAmount(e.target.value)} /></label><label>Payment date *<input className="hz-field" type="date" required value={date} onChange={e => setDate(e.target.value)} /></label><label>Payment method *<select className="hz-field" value={method} onChange={e => { setMethod(e.target.value); setDebit(''); }}>{Object.keys(methodKind).map(m => <option key={m} value={m}>{pretty(m)}</option>)}</select></label><label>Payment reference<input className="hz-field" maxLength={128} value={reference} onChange={e => setReference(e.target.value)} /></label><label>Payment account *<select className="hz-field" required value={debit} onChange={e => setDebit(e.target.value)}><option value="">Select...</option>{debitAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></label><label>Receivable account *<select className="hz-field" required value={receivable} onChange={e => setReceivable(e.target.value)}><option value="">Select...</option>{creditAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></label></fieldset>
      <h2 className="ops-section-title">Allocations {first && `- ${first.customer_name}`}</h2><Grid headers={['Policy', 'Amount', '']} empty={!selected.length}>{selected.map(s => <tr key={s.policy.id}><td>{s.policy.policy_no}</td><td><input className="hz-field p-2" aria-label={`Allocation for ${s.policy.policy_no}`} inputMode="decimal" required disabled={command.pending} value={s.amount} onChange={e => setSelected(v => v.map(a => a.policy.id === s.policy.id ? { ...a, amount: e.target.value } : a))} /></td><td><button type="button" className="hz-icon-button" title={`Remove ${s.policy.policy_no}`} disabled={command.pending} onClick={() => setSelected(v => v.filter(a => a.policy.id !== s.policy.id))}><Trash2 size={15} /></button></td></tr>)}</Grid><div className="ops-pager tabular-nums">Allocated: {first?.currency} {amountOf(total)}</div>
      </form>
    </div>
  </DialogFrame>;
}
