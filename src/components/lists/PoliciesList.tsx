import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { PolicyRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { NewQuoteWizardModal } from '../modals/NewQuoteWizardModal';

interface PoliciesListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const PoliciesList: React.FC<PoliciesListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const policies = recordsStore.getPolicies();

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
      render: (p) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('policy-360', 'none', p.id);
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
              onNavigate('customer-360', 'none', p.customerId);
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
              onNavigate('product-360', 'none', p.productId);
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
              onNavigate('broker-360', 'none', p.brokerId);
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
        <span className="font-mono font-semibold text-slate-900">
          KES {p.sumInsuredKes.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'annualPremium',
      header: 'Annual Premium',
      align: 'right',
      render: (p) => (
        <span className="font-mono font-bold text-teal-700">
          KES {p.annualPremiumKes.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (p) => {
        const isInForce = p.status === 'IN FORCE';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
              isInForce ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isInForce ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`} />
            {p.status}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <EnterpriseListPage<PolicyRecordItem>
        title="Policies & Contracts In-Force"
        subtitle="Horizon Policy Administration Ledger: Underwriting schedules, endorsements, and policy lifecycle records."
        primaryActionLabel="+ Underwrite New Policy"
        onPrimaryAction={() => setIsNewQuoteOpen(true)}
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
        onRowClick={(p) => onNavigate('policy-360', 'none', p.id)}
        densityMode={densityMode}
        keyExtractor={(p) => p.id}
      />

      <NewQuoteWizardModal
        isOpen={isNewQuoteOpen}
        onClose={() => setIsNewQuoteOpen(false)}
        onSuccess={(quoteId) => onNavigate('quote-360', 'none', quoteId)}
      />
    </>
  );
};
