import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { CustomerRecord, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { Ban, Building2, ExternalLink, Search, User, UserCheck } from 'lucide-react';
import { MODAL_IDS, useModalWrapper } from '../../store/modalStore';
import { NewCustomerModal } from '../modals/NewCustomerModal';
import { HorizonToast, Money, StatusBadge, StatusMeta } from '../horizon';

const CUSTOMER_STATUS_META: Record<CustomerRecord['status'], StatusMeta> = {
  ACTIVE: { tone: 'success', icon: UserCheck },
  'KYC REVIEW': { tone: 'warning', icon: Search },
  INACTIVE: { tone: 'danger', icon: Ban },
};

export type CustomersListScope = 'all' | 'organizations' | 'kyc';

interface CustomersListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
  scope?: CustomersListScope;
}

const SCOPE_COPY: Record<CustomersListScope, { title: string; subtitle: string }> = {
  all: {
    title: 'Customers & Insured Accounts',
    subtitle: 'Horizon Master Client Registry: Individual policyholders, commercial fleets, and corporate groups.',
  },
  organizations: {
    title: 'Organizations & Corporate Accounts',
    subtitle: 'Corporate policyholders only — fleets, employers, and institutional accounts.',
  },
  kyc: {
    title: 'KYC / Compliance Queue',
    subtitle: 'Customers flagged for Know-Your-Customer review before their accounts can go active.',
  },
};

export const CustomersList: React.FC<CustomersListProps> = ({ onNavigate, densityMode, scope = 'all' }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const newCustomerModal = useModalWrapper(MODAL_IDS.NEW_CUSTOMER);
  const [, forceRefresh] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const allCustomers = recordsStore.getCustomers();
  const customers =
    scope === 'organizations'
      ? allCustomers.filter((c) => c.customerType === 'Corporate')
      : scope === 'kyc'
      ? allCustomers.filter((c) => c.status === 'KYC REVIEW')
      : allCustomers;

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const handleDeleteCustomer = (customer: CustomerRecord) => {
    recordsStore.deleteCustomer(customer.id);
    forceRefresh((n) => n + 1);
  };

  const statusTabs: StatusTab[] =
    scope === 'kyc'
      ? [{ id: 'ALL', label: 'Pending KYC Review', count: customers.length }]
      : [
          { id: 'ALL', label: scope === 'organizations' ? 'All Organizations' : 'All Customers', count: customers.length },
          { id: 'ACTIVE', label: 'Active', count: customers.filter((c) => c.status === 'ACTIVE').length },
          { id: 'KYC REVIEW', label: 'KYC Review', count: customers.filter((c) => c.status === 'KYC REVIEW').length },
          { id: 'INACTIVE', label: 'Inactive', count: customers.filter((c) => c.status === 'INACTIVE').length },
        ];

  const columns: ColumnDef<CustomerRecord>[] = [
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      hideable: false,
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
            {c.customerType === 'Corporate' ? <Building2 className="w-3.5 h-3.5 text-teal-600" /> : <User className="w-3.5 h-3.5 text-blue-600" />}
          </div>
          <div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('customer-workspace', 'none', c.id);
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
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-[3px] text-xs">
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
        <Money amount={c.outstandingKes} className={`font-semibold ${c.outstandingKes > 0 ? 'text-rose-600' : 'text-emerald-700'}`} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (c) => {
        const meta = CUSTOMER_STATUS_META[c.status];
        return <StatusBadge label={c.status} tone={meta.tone} icon={meta.icon} />;
      },
    },
  ];

  return (
    <>
    <EnterpriseListPage<CustomerRecord>
      title={SCOPE_COPY[scope].title}
      subtitle={SCOPE_COPY[scope].subtitle}
      primaryActionLabel={scope === 'kyc' ? undefined : scope === 'organizations' ? '+ Add Organization' : '+ Add Customer'}
      onPrimaryAction={scope === 'kyc' ? undefined : () => newCustomerModal.open()}
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
      onRowClick={(c) => onNavigate('customer-workspace', 'none', c.id)}
      densityMode={densityMode}
      keyExtractor={(c) => c.id}
      onDeleteItem={handleDeleteCustomer}
      getItemLabel={(c) => `customer ${c.name} (${c.id})`}
      deleteConfirmTitle="Delete this customer?"
      deleteModuleId="customers"
      onBulkSync={() => forceRefresh((n) => n + 1)}
      helpText="Search customers by name, ID, KRA PIN, or branch. Use Bulk Sync to refresh records from core systems."
    />

    <NewCustomerModal
      isOpen={newCustomerModal.isOpen}
      onClose={newCustomerModal.close}
      lockCustomerType={scope === 'organizations' ? 'Corporate' : undefined}
      onSuccess={(customer) => {
        recordsStore.addCustomer(customer);
        forceRefresh((n) => n + 1);
        showToast(`${customer.name} added to the registry.`);
      }}
    />

    <HorizonToast message={toastMessage} tone="success" />
    </>
  );
};
