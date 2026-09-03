import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { BrokerRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { ExternalLink, Building2 } from 'lucide-react';

interface IntermediaryListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const IntermediaryList: React.FC<IntermediaryListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const brokers = recordsStore.getBrokers();

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Intermediaries', count: brokers.length },
    { id: 'Wholesale Broker', label: 'Wholesale Brokers', count: brokers.filter((b) => b.type === 'Wholesale Broker').length },
    { id: 'Corporate Broker', label: 'Corporate Brokers', count: brokers.filter((b) => b.type === 'Corporate Broker').length },
    { id: 'Bancassurance', label: 'Bancassurance', count: brokers.filter((b) => b.type === 'Bancassurance').length },
  ];

  const columns: ColumnDef<BrokerRecordItem>[] = [
    {
      key: 'name',
      header: 'Intermediary Organization',
      sortable: true,
      render: (b) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('broker-360', 'none', b.id);
            }}
            className="font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{b.name}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {b.id} • IRA Lic: {b.licenseNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Channel Type',
      render: (b) => <span className="text-slate-700 font-sans">{b.type}</span>,
    },
    {
      key: 'policies',
      header: 'In-Force Book',
      align: 'center',
      render: (b) => (
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
          {b.inForcePoliciesCount} Policies
        </span>
      ),
    },
    {
      key: 'annualGwp',
      header: 'Annual GWP',
      align: 'right',
      render: (b) => (
        <span className="font-mono font-bold text-slate-900">
          KES {(b.annualGwpKes / 1000000).toFixed(1)}M
        </span>
      ),
    },
    {
      key: 'lossRatio',
      header: 'Portfolio Loss Ratio',
      align: 'right',
      render: (b) => (
        <span className={`font-mono font-semibold ${b.lossRatioPct > 45 ? 'text-amber-600' : 'text-slate-700'}`}>
          {b.lossRatioPct}%
        </span>
      ),
    },
    {
      key: 'commission',
      header: 'Commission YTD',
      align: 'right',
      render: (b) => (
        <span className="font-mono text-teal-700 font-semibold">
          KES {(b.commissionEarnedKes / 1000000).toFixed(2)}M
        </span>
      ),
    },
    {
      key: 'status',
      header: 'IRA Status',
      align: 'center',
      render: (b) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          {b.complianceStatus}
        </span>
      ),
    },
  ];

  return (
    <EnterpriseListPage<BrokerRecordItem>
      title="Intermediary Network & Distribution"
      subtitle="Horizon Broker Ledger: Insurance Regulatory Authority (IRA) licensed brokers, agencies, and bancassurance partners."
      primaryActionLabel="+ Onboard Intermediary"
      onPrimaryAction={() => onNavigate('broker-360', 'none', brokers[0].id)}
      statusTabs={statusTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      data={brokers}
      columns={columns}
      searchPlaceholder="Search broker name, license number, channel type..."
      searchFilter={(b, query) =>
        b.name.toLowerCase().includes(query.toLowerCase()) ||
        b.licenseNumber.toLowerCase().includes(query.toLowerCase()) ||
        b.type.toLowerCase().includes(query.toLowerCase()) ||
        b.contactPerson.toLowerCase().includes(query.toLowerCase())
      }
      tabFilter={(b, tab) => (tab === 'ALL' ? true : b.type === tab)}
      onRowClick={(b) => onNavigate('broker-360', 'none', b.id)}
      densityMode={densityMode}
      keyExtractor={(b) => b.id}
    />
  );
};
