import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { TreatyRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { ExternalLink, Shield } from 'lucide-react';

interface TreatyListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const TreatyList: React.FC<TreatyListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const treaties = recordsStore.getTreaties();

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Treaties', count: treaties.length },
    { id: 'Quota Share', label: 'Quota Share', count: treaties.filter((t) => t.type === 'Quota Share').length },
    { id: 'Excess of Loss', label: 'Excess of Loss', count: treaties.filter((t) => t.type === 'Excess of Loss').length },
  ];

  const columns: ColumnDef<TreatyRecordItem>[] = [
    {
      key: 'title',
      header: 'Treaty Program & Identifier',
      sortable: true,
      render: (t) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('reinsurance-treaty-360', 'none', t.id);
            }}
            className="font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{t.title}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {t.treatyCode} • UW Year: {t.underwritingYear}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Structure',
      render: (t) => <span className="text-slate-700 font-sans">{t.type}</span>,
    },
    {
      key: 'line',
      header: 'Line Covered',
      render: (t) => <span className="text-slate-600">{t.lineOfBusiness}</span>,
    },
    {
      key: 'capacity',
      header: 'Treaty Limit',
      align: 'right',
      render: (t) => (
        <span className="font-mono font-bold text-slate-900">
          KES {(t.capacityLimitKes / 1000000).toFixed(0)}M
        </span>
      ),
    },
    {
      key: 'retention',
      header: 'Retention / Cession',
      align: 'center',
      render: (t) => (
        <span className="font-mono text-xs text-slate-700">
          {t.companyRetentionPct}% / {t.treatyCessionPct}%
        </span>
      ),
    },
    {
      key: 'lead',
      header: 'Lead Reinsurer',
      render: (t) => <span className="text-xs text-slate-600 truncate max-w-xs">{t.leadReinsurer}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (t) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          {t.status}
        </span>
      ),
    },
  ];

  return (
    <EnterpriseListPage<TreatyRecordItem>
      title="Reinsurance Treaties & Risk Cessions"
      subtitle="Horizon Outward Reinsurance Ledger: Quota share treaties, excess of loss protections, and quarterly bordereaux."
      primaryActionLabel="+ Structure Reinsurance Program"
      onPrimaryAction={() => onNavigate('reinsurance-treaty-360', 'none', treaties[0].id)}
      statusTabs={statusTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      data={treaties}
      columns={columns}
      searchPlaceholder="Search treaty code, title, reinsurer, structure..."
      searchFilter={(t, query) =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.treatyCode.toLowerCase().includes(query.toLowerCase()) ||
        t.leadReinsurer.toLowerCase().includes(query.toLowerCase()) ||
        t.lineOfBusiness.toLowerCase().includes(query.toLowerCase())
      }
      tabFilter={(t, tab) => (tab === 'ALL' ? true : t.type === tab)}
      onRowClick={(t) => onNavigate('reinsurance-treaty-360', 'none', t.id)}
      densityMode={densityMode}
      keyExtractor={(t) => t.id}
    />
  );
};
