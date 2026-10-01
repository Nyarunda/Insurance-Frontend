import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { PolicyRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { AlertTriangle, Ban, ExternalLink, RefreshCcw, ShieldCheck } from 'lucide-react';
import { MODAL_IDS, useModalWrapper } from '../../store/modalStore';
import { NewQuoteModalPayload } from '../GlobalModals';
import { Money, StatusBadge, StatusMeta } from '../horizon';

const POLICY_STATUS_META: Record<PolicyRecordItem['status'], StatusMeta> = {
  'IN FORCE': { tone: 'success', icon: ShieldCheck },
  'PENDING RENEWAL': { tone: 'warning', icon: RefreshCcw },
  LAPSED: { tone: 'danger', icon: AlertTriangle },
  CANCELLED: { tone: 'danger', icon: Ban },
};

interface PoliciesListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const PoliciesList: React.FC<PoliciesListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const newQuoteModal = useModalWrapper<NewQuoteModalPayload>(MODAL_IDS.NEW_QUOTE);
  const [, forceRefresh] = useState(0);
  const policies = recordsStore.getPolicies();

  const handleDeletePolicy = (policy: PolicyRecordItem) => {
    recordsStore.deletePolicy(policy.id);
    forceRefresh((n) => n + 1);
  };

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Policies', count: policies.length },
    { id: 'IN FORCE', label: 'In Force', count: policies.filter((p) => p.status === 'IN FORCE').length },
    { id: 'PENDING RENEWAL', label: 'Pending Renewal', count: policies.filter((p) => p.status === 'PENDING RENEWAL').length },
  ];

  const columns: ColumnDef<PolicyRecordItem>[] = [
    {
      key: 'policyNumber',
      header: 'Policy Number',
      sortable: true,
      hideable: false,
      render: (p) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('policy-workspace', 'none', p.id);
            }}
            className="font-mono font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{p.policyNumber}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-[11px] text-slate-500 font-sans">{p.productName}</div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Insured Policyholder',
      render: (p) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('customer-workspace', 'none', p.customerId);
            }}
            className="font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer"
          >
            {p.customerName}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">{p.branch}</div>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Line / Product',
      render: (p) => (
        <span
          onClick={(e) => {
            if (p.productId) {
              e.stopPropagation();
              onNavigate('product-workspace', 'none', p.productId);
            }
          }}
          className={`text-xs ${p.productId ? 'text-teal-700 hover:underline cursor-pointer' : 'text-slate-600'}`}
        >
          {p.lineOfBusiness}
        </span>
      ),
    },
    {
      key: 'broker',
      header: 'Intermediary',
      render: (p) => (
        <span
          onClick={(e) => {
            if (p.brokerId) {
              e.stopPropagation();
              onNavigate('broker-workspace', 'none', p.brokerId);
            }
          }}
          className={`text-xs ${p.brokerId ? 'text-teal-700 hover:underline cursor-pointer' : 'text-slate-600'}`}
        >
          {p.brokerName}
        </span>
      ),
    },
    {
      key: 'sumInsured',
      header: 'Sum Insured',
      align: 'right',
      render: (p) => (
        <Money amount={p.sumInsuredKes} className="font-semibold text-slate-900" />
      ),
    },
    {
      key: 'annualPremium',
      header: 'Annual Premium',
      align: 'right',
      render: (p) => (
        <Money amount={p.annualPremiumKes} className="font-bold text-teal-700" />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (p) => {
        const meta = POLICY_STATUS_META[p.status];
        return <StatusBadge label={p.status} tone={meta.tone} icon={meta.icon} />;
      },
    },
  ];

  return (
    <EnterpriseListPage<PolicyRecordItem>
      title="Policies & Contracts In-Force"
      subtitle="Horizon Policy Administration Ledger: Underwriting schedules, endorsements, and policy lifecycle records."
      primaryActionLabel="Underwrite New Policy"
      onPrimaryAction={() =>
        newQuoteModal.open({ onSuccess: (quoteId) => onNavigate('quote-workspace', 'none', quoteId) })
      }
      statusTabs={statusTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      data={policies}
      columns={columns}
      searchPlaceholder="Search policy number, customer name, vehicle reg, broker..."
      searchFilter={(p, query) =>
        p.policyNumber.toLowerCase().includes(query.toLowerCase()) ||
        p.customerName.toLowerCase().includes(query.toLowerCase()) ||
        p.brokerName.toLowerCase().includes(query.toLowerCase()) ||
        p.lineOfBusiness.toLowerCase().includes(query.toLowerCase()) ||
        (p.vehicleReg && p.vehicleReg.toLowerCase().includes(query.toLowerCase()))
      }
      tabFilter={(p, tab) => (tab === 'ALL' ? true : p.status === tab)}
      onRowClick={(p) => onNavigate('policy-workspace', 'none', p.id)}
      densityMode={densityMode}
      keyExtractor={(p) => p.id}
      onDeleteItem={handleDeletePolicy}
      getItemLabel={(p) => `policy ${p.policyNumber}`}
      deleteConfirmTitle="Delete this policy?"
      deleteModuleId="policies"
    />
  );
};
