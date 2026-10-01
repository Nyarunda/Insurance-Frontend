import React, { useState } from 'react';
import { Ban, CheckCircle2 } from 'lucide-react';
import { ColumnDef, EnterpriseListPage, StatusTab } from './EnterpriseListPage';
import { recordsStore, TenantRecordItem } from '../data/recordsStore';
import { ScreenId, DensityMode } from '../types';
import { MODAL_IDS, useModalWrapper } from '../store/modalStore';
import { NewTenantModal } from './modals/NewTenantModal';
import { HorizonToast, StatusBadge, StatusMeta } from './horizon';

interface OrganizationAdminProps {
  onNavigate: (screen: ScreenId) => void;
  densityMode: DensityMode;
}

const TENANT_STATUS_META: Record<TenantRecordItem['status'], StatusMeta> = {
  ACTIVE: { tone: 'success', icon: CheckCircle2 },
  INACTIVE: { tone: 'danger', icon: Ban },
};

export const OrganizationAdmin: React.FC<OrganizationAdminProps> = ({ densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [, forceRefresh] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const newTenantModal = useModalWrapper(MODAL_IDS.NEW_TENANT);
  const tenants = recordsStore.getTenants();

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const handleDeleteTenant = (tenant: TenantRecordItem) => {
    recordsStore.deleteTenant(tenant.id);
    forceRefresh((n) => n + 1);
  };

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Tenants', count: tenants.length },
    { id: 'ACTIVE', label: 'Active', count: tenants.filter((t) => t.status === 'ACTIVE').length },
    { id: 'INACTIVE', label: 'Inactive', count: tenants.filter((t) => t.status === 'INACTIVE').length },
  ];

  const columns: ColumnDef<TenantRecordItem>[] = [
    {
      key: 'name',
      header: 'Tenant / Company',
      sortable: true,
      hideable: false,
      render: (t) => (
        <div>
          <div className="font-bold text-slate-900">{t.name}</div>
          <div className="text-xs text-slate-500 font-mono">{t.code}</div>
        </div>
      ),
    },
    {
      key: 'domain',
      header: 'Email Domain',
      render: (t) => <span className="text-xs font-mono text-slate-600">{t.domain}</span>,
    },
    {
      key: 'region',
      header: 'Region / Description',
      render: (t) => <span className="text-xs text-slate-600">{t.region}</span>,
    },
    {
      key: 'regulator',
      header: 'Regulator',
      render: (t) => <span className="text-xs font-semibold text-slate-800">{t.regulator}</span>,
    },
    {
      key: 'currency',
      header: 'Currency',
      align: 'center',
      render: (t) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">{t.currency}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (t) => {
        const meta = TENANT_STATUS_META[t.status];
        return <StatusBadge label={t.status} tone={meta.tone} icon={meta.icon} />;
      },
    },
  ];

  return (
    <>
      <EnterpriseListPage<TenantRecordItem>
        title="Organization & Tenant Management"
        subtitle="Platform-wide directory of onboarded companies, underwriting entities, and bancassurance partners."
        primaryActionLabel="Add Tenant"
        onPrimaryAction={() => newTenantModal.open()}
        statusTabs={statusTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        data={tenants}
        columns={columns}
        searchPlaceholder="Search tenant name, code, region..."
        searchFilter={(t, query) =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.code.toLowerCase().includes(query.toLowerCase()) ||
          t.region.toLowerCase().includes(query.toLowerCase())
        }
        tabFilter={(t, tab) => (tab === 'ALL' ? true : t.status === tab)}
        densityMode={densityMode}
        keyExtractor={(t) => t.id}
        onDeleteItem={handleDeleteTenant}
        getItemLabel={(t) => `tenant ${t.name} (${t.code})`}
        deleteConfirmTitle="Delete this tenant?"
        deleteModuleId="regulatory-admin"
      />

      <NewTenantModal
        isOpen={newTenantModal.isOpen}
        onClose={newTenantModal.close}
        existingCodes={tenants.map((t) => t.code)}
        onSuccess={(tenant) => {
          recordsStore.addTenant(tenant);
          forceRefresh((n) => n + 1);
          showToast(`${tenant.name} onboarded successfully.`);
        }}
      />

      <HorizonToast message={toastMessage} tone="success" />
    </>
  );
};
