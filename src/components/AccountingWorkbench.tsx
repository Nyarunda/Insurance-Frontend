import React, { useState } from 'react';
import { Lock, Plus, Search, Scale } from 'lucide-react';
import { AuthSession, ScreenId, DensityMode, UserRole } from '../types';
import { recordsStore } from '../data/recordsStore';
import { useHasPermission } from '../store/permissionStore';
import { HorizonToast, StatusBadge } from './horizon';
import { NewAccountModal } from './modals/NewAccountModal';
import { NewJournalEntryModal, NewJournalEntryPayload } from './modals/NewJournalEntryModal';
import { JournalEntryApprovalModal } from './modals/JournalEntryApprovalModal';
import { MODAL_IDS, useModalWrapper } from '../store/modalStore';

type AccountingTab = 'journal' | 'trial-balance' | 'recon' | 'reinsurance';

interface AccountingWorkbenchProps {
  onNavigate: (screen: ScreenId) => void;
  densityMode: DensityMode;
  initialTab?: AccountingTab;
  sessionUser?: AuthSession;
  currentRole?: UserRole;
}

export const AccountingWorkbench: React.FC<AccountingWorkbenchProps> = ({
  onNavigate,
  densityMode,
  initialTab,
  sessionUser,
  currentRole,
}) => {
  const [activeTab, setActiveTab] = useState<AccountingTab>(initialTab || 'journal');
  const [searchTerm, setSearchTerm] = useState('');
  const [, forceRefresh] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reviewingEntryId, setReviewingEntryId] = useState<string | null>(null);

  const canAddAccount = useHasPermission('billing', 'add');
  const canAddJournalEntry = useHasPermission('billing', 'add');
  const newAccountModal = useModalWrapper(MODAL_IDS.NEW_ACCOUNT);
  const newJournalEntryModal = useModalWrapper(MODAL_IDS.NEW_JOURNAL_ENTRY);

  const actorName = sessionUser?.name || 'Finance Officer';
  const actorRole: UserRole = currentRole || 'finance';
  const refresh = () => forceRefresh((n) => n + 1);
  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const accounts = recordsStore.getChartOfAccounts();
  const journalEntries = recordsStore.getJournalEntries();
  const trialBalance = recordsStore.getTrialBalance();
  const branches = recordsStore.getBranches().map((b) => b.name);

  const totalDebit = trialBalance.reduce((sum, row) => sum + row.debitKes, 0);
  const totalCredit = trialBalance.reduce((sum, row) => sum + row.creditKes, 0);
  const isBooksBalanced = totalDebit === totalCredit;

  const filteredEntries = journalEntries.filter((entry) => {
    const target = `${entry.voucherNumber} ${entry.description} ${entry.reference ?? ''}`.toLowerCase();
    return target.includes(searchTerm.toLowerCase());
  });

  const paddingClass =
    densityMode === 'compact' ? 'p-2' : densityMode === 'spacious' ? 'p-4' : 'p-3';

  const pendingApproverRole = (entryId: string): UserRole | undefined => {
    const entry = recordsStore.getJournalEntry(entryId);
    if (!entry?.workflowInstanceId) return undefined;
    const instance = recordsStore.getWorkflowInstance(entry.workflowInstanceId);
    if (!instance || instance.status !== 'PENDING') return undefined;
    return instance.applicableSteps[instance.currentStepIndex]?.approverRole;
  };

  const handleCreateEntry = (payload: NewJournalEntryPayload): string | void => {
    const result = recordsStore.createJournalEntry({ ...payload, initiatedBy: actorName });
    if ('error' in result) return result.error;
    refresh();
    showToast(
      result.status === 'POSTED'
        ? `${result.voucherNumber} posted to the ledger.`
        : `${result.voucherNumber} routed for approval before posting.`
    );
  };

  const handleCreateAccount = (account: Parameters<typeof recordsStore.addAccount>[0]) => {
    const created = recordsStore.addAccount(account);
    refresh();
    showToast(`Account ${created.code} — ${created.name} added.`);
  };

  const reviewingEntry = reviewingEntryId ? recordsStore.getJournalEntry(reviewingEntryId) ?? null : null;
  const reviewingStepName = reviewingEntryId ? (() => {
    const instance = reviewingEntry?.workflowInstanceId ? recordsStore.getWorkflowInstance(reviewingEntry.workflowInstanceId) : undefined;
    return instance?.status === 'PENDING' ? instance.applicableSteps[instance.currentStepIndex]?.name : undefined;
  })() : undefined;

  const handleApprove = (comment?: string) => {
    if (!reviewingEntryId) return;
    const entry = recordsStore.approveJournalEntry(reviewingEntryId, actorName, actorRole, comment);
    refresh();
    setReviewingEntryId(null);
    if (entry?.status === 'POSTED') showToast(`${entry.voucherNumber} approved and posted.`);
    else showToast(`Approval recorded — routed to the next approver.`);
  };

  const handleReject = (comment?: string) => {
    if (!reviewingEntryId) return;
    const entry = recordsStore.rejectJournalEntry(reviewingEntryId, actorName, actorRole, comment);
    refresh();
    setReviewingEntryId(null);
    if (entry) showToast(`${entry.voucherNumber} rejected.`);
  };

  return (
    <div id="accounting-workbench-view" className="space-y-6 animate-in fade-in duration-150">
      {/* Top Master Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                FINANCE & TREASURY
              </span>
              <span className="font-mono font-bold text-xs text-teal-700">GENERAL LEDGER</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-[3px] flex items-center gap-1 border ${
                  isBooksBalanced ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isBooksBalanced ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                {isBooksBalanced ? 'BOOKS BALANCED' : 'OUT OF BALANCE'}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
              Insurance Accounting & Financial Operations
            </h1>

            <p className="text-xs text-slate-500 mt-1">
              Double-entry general journal, live trial balance, and workflow-approved postings — every entry above threshold
              routes for sign-off before it hits the ledger.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('regulatory-admin')}
              className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>IRA Solvency Pack</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Strip */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs border-t-2 border-t-teal-600">
            <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Posted Journal Entries</div>
            <div className="text-slate-900 font-bold font-mono text-base mt-1">{journalEntries.filter((e) => e.status === 'POSTED').length}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">{journalEntries.filter((e) => e.status === 'PENDING_APPROVAL').length} awaiting approval</div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs border-t-2 border-t-teal-600">
            <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Chart of Accounts</div>
            <div className="text-slate-900 font-bold font-mono text-base mt-1">{accounts.length}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">{accounts.filter((a) => a.status === 'ACTIVE').length} active accounts</div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs border-t-2 border-t-teal-600">
            <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Total Debits</div>
            <div className="text-slate-900 font-bold font-mono text-base mt-1">KES {totalDebit.toLocaleString()}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">Posted entries only</div>
          </div>
          <div className={`p-3 bg-white rounded-xl border border-slate-200 shadow-2xs border-t-2 ${isBooksBalanced ? 'border-t-emerald-600' : 'border-t-amber-500'}`}>
            <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Trial Balance Delta</div>
            <div className={`font-bold font-mono text-base mt-1 ${isBooksBalanced ? 'text-emerald-700' : 'text-amber-700'}`}>
              KES {Math.abs(totalDebit - totalCredit).toLocaleString()}
            </div>
            <div className={`text-[11px] font-semibold mt-0.5 ${isBooksBalanced ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isBooksBalanced ? `Debits = Credits (KES ${totalDebit.toLocaleString()})` : 'Investigate unbalanced postings'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 border-b border-slate-200 flex space-x-6 text-xs font-semibold overflow-x-auto">
          {(
            [
              { id: 'journal', label: 'General Journal Entries' },
              { id: 'trial-balance', label: 'Chart of Accounts & Trial Balance' },
              { id: 'recon', label: 'M-Pesa & Bank Reconciliation' },
              { id: 'reinsurance', label: 'Reinsurance Bordereaux Clearing' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 transition-colors relative whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-teal-700 font-bold border-b-2 border-teal-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: General Journal */}
      {activeTab === 'journal' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                Double-Entry General Journal
              </h2>
              <p className="text-xs text-slate-500">Entries above the approval threshold route through the Journal Entry Approval workflow.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter vouchers..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs border border-slate-200 bg-slate-50 focus:outline-hidden focus:border-teal-500"
                />
              </div>
              <button
                onClick={() => newJournalEntryModal.open()}
                disabled={!canAddJournalEntry}
                title={canAddJournalEntry ? undefined : "You don't have permission to create journal entries."}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {canAddJournalEntry ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>New Journal Entry</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase font-mono">
                <tr>
                  <th className={paddingClass}>Voucher / Date</th>
                  <th className={paddingClass}>Description</th>
                  <th className={paddingClass}>Ledger Lines</th>
                  <th className={`${paddingClass} text-right`}>Amount (KES)</th>
                  <th className={paddingClass}>Status</th>
                  <th className={`${paddingClass} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => {
                  const approverRole = pendingApproverRole(entry.id);
                  const canActOnThis = entry.status === 'PENDING_APPROVAL' && approverRole === actorRole;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className={paddingClass}>
                        <div className="font-mono font-bold text-teal-700">{entry.voucherNumber}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{entry.date}</div>
                      </td>
                      <td className={paddingClass}>
                        <div className="font-semibold text-slate-900">{entry.description}</div>
                        {entry.reference && <div className="text-[11px] font-mono text-slate-500">{entry.reference}</div>}
                      </td>
                      <td className={paddingClass}>
                        {entry.lines.map((line, i) => (
                          <div key={i} className="font-mono text-[11px] text-slate-700">
                            {line.debitKes > 0 ? `Dr ${line.accountCode}` : `Cr ${line.accountCode}`} — {line.accountName}
                          </div>
                        ))}
                      </td>
                      <td className={`${paddingClass} text-right font-mono font-bold text-slate-900`}>
                        KES {entry.totalKes.toLocaleString()}
                      </td>
                      <td className={paddingClass}>
                        <StatusBadge
                          label={entry.status.replace('_', ' ')}
                          tone={entry.status === 'POSTED' ? 'success' : entry.status === 'REJECTED' ? 'danger' : 'warning'}
                        />
                        {entry.status === 'PENDING_APPROVAL' && approverRole && (
                          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting {approverRole}</div>
                        )}
                      </td>
                      <td className={`${paddingClass} text-right`}>
                        {canActOnThis && (
                          <button
                            onClick={() => setReviewingEntryId(entry.id)}
                            className="px-2.5 py-1 rounded bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold border border-teal-200 text-[11px]"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No journal entries match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Trial Balance */}
      {activeTab === 'trial-balance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                General Ledger Trial Balance
              </h2>
              <p className="text-xs text-slate-500">Computed live from posted journal entries.</p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`text-xs font-mono font-bold px-3 py-1 rounded border ${
                  isBooksBalanced ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}
              >
                {isBooksBalanced ? 'Balanced: Total Debits = Total Credits' : 'Out of balance'}
              </div>
              <button
                onClick={() => newAccountModal.open()}
                disabled={!canAddAccount}
                title={canAddAccount ? undefined : "You don't have permission to add accounts."}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {canAddAccount ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Add Account</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase font-mono">
                <tr>
                  <th className={paddingClass}>Account Code</th>
                  <th className={paddingClass}>Account Description</th>
                  <th className={paddingClass}>Type</th>
                  <th className={paddingClass}>Normal Balance</th>
                  <th className={paddingClass}>Status</th>
                  <th className={`${paddingClass} text-right`}>Debit (KES)</th>
                  <th className={`${paddingClass} text-right`}>Credit (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trialBalance.map((row) => (
                  <tr key={row.account.id} className="hover:bg-slate-50">
                    <td className={`${paddingClass} font-mono font-bold text-teal-700`}>{row.account.code}</td>
                    <td className={`${paddingClass} font-semibold text-slate-900`}>{row.account.name}</td>
                    <td className={paddingClass}>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                        {row.account.type}
                      </span>
                    </td>
                    <td className={`${paddingClass} text-slate-600 font-mono`}>{row.account.normalBalance}</td>
                    <td className={paddingClass}>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          row.account.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {row.account.status}
                      </span>
                    </td>
                    <td className={`${paddingClass} text-right font-mono font-bold text-slate-900`}>
                      {row.debitKes > 0 ? `KES ${row.debitKes.toLocaleString()}` : '—'}
                    </td>
                    <td className={`${paddingClass} text-right font-mono font-bold text-slate-900`}>
                      {row.creditKes > 0 ? `KES ${row.creditKes.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-mono text-xs font-bold text-slate-900">
                <tr>
                  <td colSpan={5} className={`${paddingClass} text-right uppercase`}>
                    Total Verified Sum:
                  </td>
                  <td className={`${paddingClass} text-right ${isBooksBalanced ? 'text-emerald-800' : 'text-amber-700'}`}>
                    KES {totalDebit.toLocaleString()}
                  </td>
                  <td className={`${paddingClass} text-right ${isBooksBalanced ? 'text-emerald-800' : 'text-amber-700'}`}>
                    KES {totalCredit.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: M-Pesa & Bank Recon */}
      {activeTab === 'recon' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Automated Clearing & Settlement Gateway</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Safaricom Paybill 881200</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">KES 2,450,800</div>
              <div className="text-emerald-700 text-[11px] mt-1">100% matched to invoice numbers</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Pesalink Clearing</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">KES 14,200,000</div>
              <div className="text-emerald-700 text-[11px] mt-1">Real-time interbank settlement</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Unallocated Payments</span>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-1">KES 0.00</div>
              <div className="text-slate-500 text-[11px] mt-1">Zero unmapped client remittances</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Reinsurance */}
      {activeTab === 'reinsurance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Reinsurance Bordereaux Clearing (Kenya Re, Zep-Re, Africa Re)</h2>
          <p className="text-xs text-slate-500">
            Automated quota share and surplus treaty apportionments generated from quarterly underwriting closes.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-2">
            <div className="flex justify-between">
              <span>Treaty Year: 2026 Quota Share 20%</span>
              <span className="font-bold text-teal-700">Active</span>
            </div>
            <div className="flex justify-between">
              <span>Ceded Gross Premium (YTD):</span>
              <span>KES 24,800,000</span>
            </div>
            <div className="flex justify-between">
              <span>Reinsurance Commission Earned (25%):</span>
              <span className="text-emerald-700 font-bold">KES 6,200,000</span>
            </div>
          </div>
        </div>
      )}

      <NewAccountModal
        isOpen={newAccountModal.isOpen}
        onClose={newAccountModal.close}
        existingCodes={accounts.map((a) => a.code)}
        onSuccess={handleCreateAccount}
      />

      <NewJournalEntryModal
        isOpen={newJournalEntryModal.isOpen}
        onClose={newJournalEntryModal.close}
        accounts={accounts}
        branches={branches}
        onSuccess={handleCreateEntry}
      />

      <JournalEntryApprovalModal
        entry={reviewingEntry}
        stepName={reviewingStepName}
        onClose={() => setReviewingEntryId(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <HorizonToast message={toastMessage} tone="success" />
    </div>
  );
};
