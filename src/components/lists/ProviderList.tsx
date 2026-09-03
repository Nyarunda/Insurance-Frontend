import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { ProviderRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { ExternalLink, Wrench } from 'lucide-react';

interface ProviderListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const ProviderList: React.FC<ProviderListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const providers = recordsStore.getProviders();

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
      render: (p) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('provider-360', 'none', p.id);
            }}
            className="font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{p.name}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
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
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
          {p.activeWorkOrdersCount}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (p) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          {p.status}
        </span>
      ),
    },
  ];

  return (
    <EnterpriseListPage<ProviderRecordItem>
      title="Accredited Service Providers & Vendors"
      subtitle="Horizon Provider Network: Certified motor assessors, authorized repair bodyshops, and medical panels."
      primaryActionLabel="+ Accredit New Provider"
      onPrimaryAction={() => onNavigate('provider-360', 'none', providers[0].id)}
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
      onRowClick={(p) => onNavigate('provider-360', 'none', p.id)}
      densityMode={densityMode}
      keyExtractor={(p) => p.id}
    />
  );
};
