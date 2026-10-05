/**
 * My work (FI1-B): `GET /work-queue` only. Nothing is inferred from other data; a task is shown
 * while the server lists it. Refreshed by the button and whenever the user returns to the tab.
 *
 * DESIGN-1: the template's list page: metric cards over one card holding a search toolbar and the
 * table. The search only narrows what the server listed; it never adds or hides tasks otherwise.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Clock3, FileText, Inbox, RefreshCw, Search, UsersRound } from 'lucide-react';
import { Card, HorizonLoader, HorizonPage, HorizonPageTitle, StatCard } from '../../components/horizon';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { changeSummary, formatDateTime, formatMoney, humanize } from '../workflow/format';
import { useWorkQueue } from '../workflow/queries';
import type { WorkQueueItem } from '../workflow/types';

export const EMPTY_QUEUE_TEXT = 'Nothing is waiting for you';

/** How long a task has waited, in words: "12 min", "5 h", "3 days". */
export function waitingFor(assignedAt: string | null, now = Date.now()): string {
  if (!assignedAt) return '—';
  const started = new Date(assignedAt).getTime();
  if (Number.isNaN(started)) return '—';
  const minutes = Math.max(0, Math.floor((now - started) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} days`;
}

const recordOf = (item: WorkQueueItem) => `${humanize(item.resource_type)}${item.resource_reference ? ` ${item.resource_reference}` : ''}`;

const matches = (item: WorkQueueItem, query: string) =>
  [recordOf(item), item.stage_label, humanize(item.definition_code), changeSummary(item.approval_facts, item.currency) ?? '']
    .join(' ')
    .toLowerCase()
    .includes(query);

export const WorkQueuePage: React.FC = () => {
  const queue = useWorkQueue();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const items = useMemo(() => queue.data?.results ?? [], [queue.data]);
  const query = search.trim().toLowerCase();
  const shown = query ? items.filter((item) => matches(item, query)) : items;
  const open = (item: WorkQueueItem) => navigate(`/my-work/list/${encodeURIComponent(item.workflow_instance_id)}`);

  const oldest = items.reduce<WorkQueueItem | null>(
    (first, item) => (item.assigned_at && (!first?.assigned_at || item.assigned_at < first.assigned_at) ? item : first),
    null,
  );
  const forColleagues = items.filter((item) => item.acting_for_user_id).length;

  return (
    <HorizonPage id="work-queue">
      <HorizonPageTitle
        title="My Work Queue"
        subtitle={queue.isSuccess ? `${items.length} ${items.length === 1 ? 'task' : 'tasks'} waiting for you` : 'Approval tasks'}
        actions={
          <button
            type="button"
            className="hz-button hz-button-secondary"
            onClick={() => void queue.refetch()}
            disabled={queue.isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${queue.isFetching ? 'animate-spin' : ''}`} />
            {queue.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {queue.isSuccess && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Inbox} label="Waiting" value={items.length} caption="Approvals assigned to you" />
          <StatCard
            icon={Clock3}
            label="Oldest task"
            value={oldest ? waitingFor(oldest.assigned_at) : '—'}
            caption={oldest ? `Assigned ${formatDateTime(oldest.assigned_at)}` : 'No tasks'}
          />
          <StatCard
            icon={UsersRound}
            label="For a colleague"
            value={forColleagues}
            caption={forColleagues ? 'Held while you act for someone' : 'All are your own'}
          />
        </div>
      )}

      <Card flush>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hz-border-grid)] px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--hz-text-primary)]">Tasks</h2>
            <p className="text-[13px] text-[var(--hz-text-muted)]">Open a task to see what is being approved and decide it.</p>
          </div>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search tasks</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--hz-text-muted)]" />
            <input
              type="search"
              className="hz-field w-full pl-8"
              placeholder="Search record, stage or change"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={!queue.isSuccess || items.length === 0}
            />
          </label>
        </div>

        {queue.isPending && (
          <div className="p-6">
            <HorizonLoader tip="Loading your tasks..." />
          </div>
        )}
        {queue.isError && (
          <div className="p-4">
            <ApiErrorAlert error={queue.error} title="Your tasks could not be loaded" />
          </div>
        )}
        {queue.isSuccess && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center" role="status">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--hz-surface-muted)] text-[var(--hz-text-muted)]">
              <Inbox className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-[var(--hz-text-primary)]">{EMPTY_QUEUE_TEXT}</p>
            <p className="text-[13px] text-[var(--hz-text-muted)]">New approvals assigned to you appear here.</p>
          </div>
        )}
        {queue.isSuccess && items.length > 0 && shown.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-[var(--hz-text-muted)]" role="status">
            No tasks match “{search.trim()}”.
          </p>
        )}
        {shown.length > 0 && (
          <div className="overflow-x-auto">
            <table className="hz-grid w-full" aria-label="Tasks">
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Stage</th>
                  <th>Approval</th>
                  <th className="text-right">Amount</th>
                  <th>Waiting</th>
                  <th aria-hidden="true" className="w-8" />
                </tr>
              </thead>
              <tbody>
                {shown.map((item) => {
                  // RUP1-F1: what the change is, so two pending changes can be told apart.
                  const change = changeSummary(item.approval_facts, item.currency);
                  return (
                    <tr
                      key={item.assignment_id}
                      tabIndex={0}
                      className="group cursor-pointer"
                      onClick={() => open(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') open(item);
                      }}
                    >
                      <td>
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--hz-border-grid)] bg-[var(--hz-surface-subtle)] text-[var(--hz-text-secondary)]">
                            <FileText className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <span className="block font-medium text-[var(--hz-text-primary)]">{recordOf(item)}</span>
                            {change && <span className="block text-[13px] text-[var(--hz-text-secondary)]">{change}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex h-[22px] items-center gap-1.5 rounded-sm border border-[var(--hz-border)] px-2 text-[13px] font-medium whitespace-nowrap text-[var(--hz-text-primary)]">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--hz-warning)]" />
                            {item.stage_label}
                          </span>
                          {item.acting_for_user_id && (
                            <span className="text-[13px] text-[var(--hz-text-secondary)]">for a colleague</span>
                          )}
                        </span>
                      </td>
                      <td className="text-[var(--hz-text-secondary)]">{humanize(item.definition_code)}</td>
                      <td className="text-right tabular-nums">{formatMoney(item.amount, item.currency, item.amount_reason)}</td>
                      <td>
                        <span className="block font-medium tabular-nums text-[var(--hz-text-primary)]">{waitingFor(item.assigned_at)}</span>
                        <span className="block text-[13px] text-[var(--hz-text-muted)]">{formatDateTime(item.assigned_at)}</span>
                      </td>
                      <td className="text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-[var(--hz-text-muted)] transition-transform group-hover:translate-x-0.5" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {queue.isSuccess && items.length > 0 && (
          <div className="border-t border-[var(--hz-border-grid)] px-4 py-2.5 text-[13px] text-[var(--hz-text-muted)]">
            {query ? `Showing ${shown.length} of ${items.length}` : `${items.length} ${items.length === 1 ? 'task' : 'tasks'}`}
          </div>
        )}
      </Card>
    </HorizonPage>
  );
};
