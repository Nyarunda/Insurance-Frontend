import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { CustomerRecord, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { ExternalLink, Building2, User } from 'lucide-react';
import { NewQuoteWizardModal } from '../modals/NewQuoteWizardModal';

interface CustomersListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const CustomersList: React.FC<CustomersListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const customers = recordsStore.getCustomers();

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Customers', count: customers.length },
    { id: 'ACTIVE', label: 'Active', count: customers.filter((c) => c.status === 'ACTIVE').length },
    { id: 'KYC REVIEW', label: 'KYC Review', count: customers.filter((c) => c.status === 'KYC REVIEW').length },
    { id: 'INACTIVE', label: 'Inactive', count: customers.filter((c) => c.status === 'INACTIVE').length },
  ];

  const columns: ColumnDef<CustomerRecord>[] = [
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
            {c.customerType === 'Corporate' ? <Building2 className="w-3.5 h-3.5 text-teal-600" /> : <User className="w-3.5 h-3.5 text-blue-600" />}
          </div>
          <div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('customer-360', 'none', c.id);
              }}
              className="font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{c.name}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {c.id} • KRA: {c.kraPin}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (c) => (
        <span className="text-slate-600 font-sans">{c.customerType}</span>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (c) => <span className="text-slate-600">{c.branch}</span>,
    },
    {
      key: 'policies',
      header: 'Policies',
      align: 'center',
      render: (c) => (
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
          {c.activePoliciesCount}
        </span>
      ),
    },
    {
      key: 'lossRatio',
      header: 'Loss Ratio',
      align: 'right',
      render: (c) => (
        <span className={`font-mono font-semibold ${c.lossRatioPct > 50 ? 'text-amber-600' : 'text-slate-700'}`}>
          {c.lossRatioPct}%
        </span>
      ),
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      render: (c) => (
        <span className={`font-mono font-semibold ${c.outstandingKes > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
          KES {c.outstandingKes.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (c) => {
        const isAct = c.status === 'ACTIVE';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              isAct ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isAct ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`} />
            {c.status}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <EnterpriseListPage<CustomerRecord>
        title="Customers & Insured Accounts"
        subtitle="Horizon Master Client Registry: Individual policyholders, commercial fleets, and corporate groups."
        primaryActionLabel="+ New Underwriting Quote"
        onPrimaryAction={() => setIsNewQuoteModalOpen(true)}
        statusTabs={statusTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        data={customers}
        columns={columns}
        searchPlaceholder="Search customer name, Customer ID, KRA PIN, branch..."
        searchFilter={(c, q) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.id.toLowerCase().includes(q.toLowerCase()) ||
          c.kraPin.toLowerCase().includes(q.toLowerCase()) ||
          c.branch.toLowerCase().includes(q.toLowerCase())
        }
        tabFilter={(c, tab) => (tab === 'ALL' ? true : c.status === tab)}
        onRowClick={(c) => onNavigate('customer-360', 'none', c.id)}
        densityMode={densityMode}
        keyExtractor={(c) => c.id}
      />

      <NewQuoteWizardModal
        isOpen={isNewQuoteModalOpen}
        onClose={() => setIsNewQuoteModalOpen(false)}
        onSuccess={(quoteId) => onNavigate('quote-360', 'none', quoteId)}
      />
    </>
  );
};
