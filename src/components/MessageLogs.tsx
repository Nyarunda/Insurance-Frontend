import React, { useState } from 'react';
import { Eye, RefreshCw, Search } from 'lucide-react';
import { DensityMode } from '../types';
import { HorizonContentViewer, HorizonPage, HorizonPageContent, HorizonPageTitle, Status } from './horizon';

interface MessageLogsProps {
  densityMode: DensityMode;
}

const logs = [
  {
    id: 'MSG-100982',
    channel: 'M-Pesa Daraja',
    direction: 'IN',
    reference: 'RK89104JK2',
    status: 'Processed',
    receivedAt: '03 Sep 2026 10:44:18',
    payload: '<payment><receipt>RK89104JK2</receipt><amount>182450</amount><account>POL/MTR/2026/00182</account><status>SUCCESS</status></payment>',
  },
  {
    id: 'MSG-100981',
    channel: 'IRA DMVIC',
    direction: 'OUT',
    reference: 'CERT-KDJ-123A',
    status: 'Queued',
    receivedAt: '03 Sep 2026 10:41:02',
    payload: '<certificate><policy>POL/MTR/2026/00182</policy><vehicle>KDJ 123A</vehicle><action>ISSUE</action></certificate>',
  },
  {
    id: 'MSG-100980',
    channel: 'Email Gateway',
    direction: 'OUT',
    reference: 'Q/MTR/2026/008291',
    status: 'Failed',
    receivedAt: '03 Sep 2026 10:35:49',
    payload: '<message><to>broker@marsh.co.ke</to><subject>Quotation Proposal</subject><error>SMTP timeout</error></message>',
  },
];

export const MessageLogs: React.FC<MessageLogsProps> = ({ densityMode }) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(logs[0].id);
  const selectedLog = logs.find((log) => log.id === selectedId) || logs[0];
  const rowHeight =
    densityMode === 'compact'
      ? 'h-[var(--hz-table-row-compact)]'
      : densityMode === 'spacious'
      ? 'h-[52px]'
      : 'h-[var(--hz-table-row-default)]';
  const filteredLogs = logs.filter((log) =>
    `${log.id} ${log.channel} ${log.reference} ${log.status}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <HorizonPage id="message-logs-view">
      <HorizonPageTitle
        title="Message Logs"
        subtitle="Integration gateway"
        actions={
          <button className="hz-button hz-button-secondary">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        }
      />

      <HorizonPageContent>
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="border-b xl:border-b-0 xl:border-r border-[var(--hz-divider)]">
            <div className="hz-toolbar px-4 py-2 bg-[var(--hz-surface-subtle)]">
              <label className="hz-field flex max-w-md flex-1 items-center gap-2 px-3">
                <Search className="h-4 w-4 text-[var(--hz-text-subtle)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-xs outline-none"
                  placeholder="Search logs"
                />
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--hz-divider)] bg-[var(--hz-surface-subtle)] text-[11px] uppercase text-[var(--hz-text-subtle)] font-mono">
                    <th className="px-4 py-2">Message ID</th>
                    <th className="px-4 py-2">Channel</th>
                    <th className="px-4 py-2">Direction</th>
                    <th className="px-4 py-2">Reference</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hz-divider)]">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedId(log.id)}
                      className={`${rowHeight} cursor-pointer ${selectedId === log.id ? 'bg-[var(--hz-selected)]' : 'hover:bg-[var(--hz-hover)]'}`}
                    >
                      <td className="px-4 py-2 font-mono font-bold text-[var(--hz-primary)]">{log.id}</td>
                      <td className="px-4 py-2 font-semibold text-[var(--hz-text-primary)]">{log.channel}</td>
                      <td className="px-4 py-2 font-mono text-[var(--hz-text-secondary)]">{log.direction}</td>
                      <td className="px-4 py-2 font-mono text-[var(--hz-text-secondary)]">{log.reference}</td>
                      <td className="px-4 py-2">
                        <Status tone={log.status === 'Failed' ? 'danger' : log.status === 'Queued' ? 'warning' : 'success'}>
                          {log.status}
                        </Status>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button className="hz-icon-button !h-7 !w-7" title="View payload">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside>
            <div className="border-b border-[var(--hz-divider)] bg-[var(--hz-surface-subtle)] px-4 py-2">
              <div className="font-mono text-[11px] font-bold uppercase text-[var(--hz-text-subtle)]">Payload</div>
              <div className="mt-0.5 text-xs font-semibold text-[var(--hz-text-primary)]">{selectedLog.id}</div>
            </div>
            <HorizonContentViewer content={selectedLog.payload} contentType="XML" />
          </aside>
        </div>
      </HorizonPageContent>
    </HorizonPage>
  );
};
