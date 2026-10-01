import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { ProviderRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { AlertTriangle, Ban, CheckCircle2, ExternalLink, Wrench } from 'lucide-react';
import { StatusBadge, StatusMeta } from '../horizon';

const PROVIDER_STATUS_META: Record<ProviderRecordItem['status'], StatusMeta> = {
  ACTIVE: { tone: 'success', icon: CheckCircle2 },
  'ON PROBATION': { tone: 'warning', icon: AlertTriangle },
  SUSPENDED: { tone: 'danger', icon: Ban },
};

interface ProviderListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const ProviderList: React.FC<ProviderListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [, forceRefresh] = useState(0);
  const providers = recordsStore.getProviders();

  const handleDeleteProvider = (provider: ProviderRecordItem) => {
    recordsStore.deleteProvider(provider.id);
    forceRefresh((n) => n + 1);
  };

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Providers', count: providers.length },
    { id: 'Motor Loss Assessor', label: 'Motor Assessors', count: providers.filter((p) => p.providerType === 'Motor Loss Assessor').length },
    { id: 'Authorized Garage', label: 'Garages', count: providers.filter((p) => p.providerType === 'Authorized Garage').length },
    { id: 'Medical Provider', label: 'Hospitals / Clinics', count: providers.filter((p) => p.providerType === 'Medical Provider').length },
    { id: 'Fraud Investigator', label: 'SIU Investigators', count: providers.filter((p) => p.providerType === 'Fraud Investigator').length },
  ];

  const columns: ColumnDef<ProviderRecordItem>[] = [
    {
      key: 'name',
      header: 'Service Partner / Network Name',
      sortable: true,
      hideable: false,
      render: (p) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('provider-workspace', 'none', p.id);
            }}
            className="font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{p.name}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {p.id} • Lic: {p.registrationNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Accredited Category',
      render: (p) => <span className="text-slate-700 font-sans">{p.providerType}</span>,
    },
    {
      key: 'location',
      header: 'Geographic Zone',
      render: (p) => <span className="text-slate-600">{p.location}</span>,
    },
    {
      key: 'tat',
      header: 'Avg TAT',
      align: 'right',
      render: (p) => (
        <span className="font-mono font-bold text-slate-800">
          {p.averageTatHours} hrs
        </span>
      ),
    },
    {
      key: 'sla',
      header: 'SLA Compliance',
      align: 'right',
      render: (p) => (
        <span className={`font-mono font-bold ${p.slaCompliancePct > 95 ? 'text-emerald-700' : 'text-amber-600'}`}>
          {p.slaCompliancePct}%
        </span>
      ),
    },
    {
      key: 'activeOrders',
      header: 'Active Orders',
      align: 'center',
      render: (p) => (
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-[3px] text-xs">
          {p.activeWorkOrdersCount}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (p) => {
        const meta = PROVIDER_STATUS_META[p.status];
        return <StatusBadge label={p.status} tone={meta.tone} icon={meta.icon} />;
      },
    },
  ];

  return (
    <EnterpriseListPage<ProviderRecordItem>
      title="Accredited Service Providers & Vendors"
      subtitle="Horizon Provider Network: Certified motor assessors, authorized repair bodyshops, and medical panels."
      primaryActionLabel="Accredit New Provider"
      onPrimaryAction={() => onNavigate('provider-workspace', 'none', providers[0].id)}
      statusTabs={statusTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      data={providers}
      columns={columns}
      searchPlaceholder="Search provider name, registration, category, zone..."
      searchFilter={(p, query) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.registrationNumber.toLowerCase().includes(query.toLowerCase()) ||
        p.providerType.toLowerCase().includes(query.toLowerCase()) ||
        p.location.toLowerCase().includes(query.toLowerCase())
      }
      tabFilter={(p, tab) => (tab === 'ALL' ? true : p.providerType === tab)}
      onRowClick={(p) => onNavigate('provider-workspace', 'none', p.id)}
      densityMode={densityMode}
      keyExtractor={(p) => p.id}
      onDeleteItem={handleDeleteProvider}
      getItemLabel={(p) => `provider ${p.name}`}
      deleteConfirmTitle="Delete this provider?"
      deleteModuleId="providers"
    />
  );
};
