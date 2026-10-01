import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { ActivityEvent, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';

interface ActivityLogViewProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
};

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({ densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const events = recordsStore.getActivities();

  const entityTypes = Array.from(new Set(events.map((e) => e.entityType)));

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Activity', count: events.length },
    ...entityTypes.map((type) => ({
      id: type,
      label: type,
      count: events.filter((e) => e.entityType === type).length,
    })),
  ];

  const columns: ColumnDef<ActivityEvent>[] = [
    {
      key: 'timestamp',
      header: 'When',
      sortable: true,
      hideable: false,
      render: (e) => <span className="font-mono text-xs text-slate-600 whitespace-nowrap">{formatTimestamp(e.timestamp)}</span>,
    },
    {
      key: 'entity',
      header: 'Record',
      render: (e) => (
        <div>
          <div className="font-bold text-slate-900">{e.entityType}</div>
          <div className="text-xs text-slate-500 font-mono">{e.entityId}</div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (e) => (
        <span className="inline-flex px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
          {e.action}
        </span>
      ),
    },
    {
      key: 'author',
      header: 'Performed By',
      render: (e) => <span className="text-slate-700 font-sans">{e.author}</span>,
    },
    {
      key: 'details',
      header: 'Details',
      render: (e) => <span className="text-slate-600">{e.details}</span>,
    },
  ];

  return (
    <EnterpriseListPage<ActivityEvent>
      title="System Activity & Audit Trail"
      subtitle="Chronological audit log of recorded user and system changes across Insurance Cloud."
      statusTabs={statusTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      data={events}
      columns={columns}
      searchPlaceholder="Search by entity, action, author, or details..."
      searchFilter={(e, query) => {
        const target = `${e.entityType} ${e.entityId} ${e.action} ${e.author} ${e.details}`.toLowerCase();
        return target.includes(query.toLowerCase());
      }}
      tabFilter={(e, tab) => (tab === 'ALL' ? true : e.entityType === tab)}
      densityMode={densityMode}
      keyExtractor={(e) => e.id}
    />
  );
};
