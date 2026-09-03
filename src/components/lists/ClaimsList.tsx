import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { ClaimRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { NewClaimWizardModal } from '../modals/NewClaimWizardModal';

interface ClaimsListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const ClaimsList: React.FC<ClaimsListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [isFnolModalOpen, setIsFnolModalOpen] = useState(false);
  const claims = recordsStore.getClaims();

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Claims', count: claims.length },
    { id: 'FNOL', label: 'FNOL Intake', count: claims.filter((c) => c.status === 'FNOL').length },
    { id: 'ASSESSMENT', label: 'Assessment', count: claims.filter((c) => c.status === 'ASSESSMENT').length },
    { id: 'VALIDATION', label: 'Validation', count: claims.filter((c) => c.status === 'VALIDATION').length },
    { id: 'CLOSED', label: 'Closed / Settled', count: claims.filter((c) => c.status === 'CLOSED').length },
  ];

  const columns: ColumnDef<ClaimRecordItem>[] = [
    {
      key: 'claimNumber',
      header: 'Claim ID / Ref',
      sortable: true,
      render: (c) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('claims-360', 'none', c.id);
            }}
            className="font-mono font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{c.claimNumber}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Loss: {c.lossDate}</div>
        </div>
      ),
    },
    {
      key: 'policy',
      header: 'Policy Ref',
      render: (c) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onNavigate('policy-360', 'none', c.policyNumber);
          }}
          className="font-mono text-xs text-teal-700 hover:underline cursor-pointer"
        >
          {c.policyNumber}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Insured Claimant',
      render: (c) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('customer-360', 'none', c.customerId);
            }}
            className="font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer"
          >
            {c.customerName}
          </div>
          <div className="text-[11px] text-slate-500 truncate max-w-xs">{c.lossType}</div>
        </div>
      ),
    },
    {
      key: 'assessor',
      header: 'Service Provider / Assessor',
      render: (c) => (
        <span
          onClick={(e) => {
            if (c.assessorId) {
              e.stopPropagation();
              onNavigate('provider-360', 'none', c.assessorId);
            }
          }}
          className={`text-xs ${c.assessorId ? 'text-teal-700 hover:underline cursor-pointer' : 'text-slate-600'}`}
        >
          {c.assessorName}
        </span>
      ),
    },
    {
      key: 'reserve',
      header: 'Outstanding Reserve',
      align: 'right',
      render: (c) => (
        <span className="font-mono font-bold text-slate-900">
          KES {c.outstandingReserveKes.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'sla',
      header: 'SLA Window',
      align: 'center',
      render: (c) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
          {c.slaRemainingHours}h Left
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (c) => {
        let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
        if (c.status === 'ASSESSMENT') badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
        if (c.status === 'FNOL') badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
        if (c.status === 'VALIDATION') badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
        if (c.status === 'CLOSED') badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {c.status}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <EnterpriseListPage<ClaimRecordItem>
        title="Claims Dossiers & FNOL Register"
        subtitle="Horizon Claims Administration Ledger: Loss notifications, survey reports, reserving, and settlement execution."
        primaryActionLabel="+ Register FNOL"
        onPrimaryAction={() => setIsFnolModalOpen(true)}
        statusTabs={statusTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        data={claims}
        columns={columns}
        searchPlaceholder="Search claim ID, policy, customer, loss type, assessor..."
        searchFilter={(c, query) =>
          c.claimNumber.toLowerCase().includes(query.toLowerCase()) ||
          c.policyNumber.toLowerCase().includes(query.toLowerCase()) ||
          c.customerName.toLowerCase().includes(query.toLowerCase()) ||
          c.lossType.toLowerCase().includes(query.toLowerCase()) ||
          c.assessorName.toLowerCase().includes(query.toLowerCase())
        }
        tabFilter={(c, tab) => (tab === 'ALL' ? true : c.status === tab)}
        onRowClick={(c) => onNavigate('claims-360', 'none', c.id)}
        densityMode={densityMode}
        keyExtractor={(c) => c.id}
      />

      <NewClaimWizardModal
        isOpen={isFnolModalOpen}
        onClose={() => setIsFnolModalOpen(false)}
        onSuccess={(claimId) => onNavigate('claims-360', 'none', claimId)}
      />
    </>
  );
};
