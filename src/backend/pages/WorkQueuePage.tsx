/**
 * My work (FI1-B): `GET /work-queue` only. Nothing is inferred from other data; a task is shown
 * while the server lists it. Refreshed by the button and whenever the user returns to the tab.
 *
 * DESIGN-1: the template's list page: metric cards over one card holding a search toolbar and the
 * table. The search only narrows what the server listed; it never adds or hides tasks otherwise.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CalendarClock, Clock3, FileText, Inbox, RefreshCw, UsersRound } from 'lucide-react';
import {
  DotTag,
  EmptyState,
  HorizonLoader,
  HorizonPage,
  HorizonPageTitle,
  ListCard,
  openableRow,
  RecordCell,
  RowChevron,
  SearchField,
  StackedCell,
  StatCard,
  StatGrid,
} from '../../components/horizon';
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

const instanceHref = (item: WorkQueueItem) => `/my-work/list/${encodeURIComponent(item.workflow_instance_id)}`;

/** The task rows, as on My Work Queue; `compact` (Home) leaves out the approval and amount. */
export const TaskTable: React.FC<{ items: WorkQueueItem[]; compact?: boolean }> = ({ items, compact = false }) => {
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto">
      <table className="hz-grid w-full" aria-label="Tasks">
        <thead>
          <tr>
            <th>Record</th>
            <th>Stage</th>
            {!compact && <th className="text-right">Amount</th>}
            <th className={compact ? '' : 'pl-8'}>Waiting</th>
            <th aria-hidden="true" className="w-10" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.assignment_id} {...openableRow(() => navigate(instanceHref(item)))}>
              <td>
                {/* RUP1-F1: what the change is, so two pending changes can be told apart. */}
                <RecordCell icon={FileText} title={recordOf(item)} detail={changeSummary(item.approval_facts, item.currency)} />
              </td>
              <td>
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <DotTag label={item.stage_label} />
                  {item.acting_for_user_id && <span className="text-[13px] text-[var(--hz-text-secondary)]">for a colleague</span>}
                </span>
                {!compact && <span className="mt-1 block text-[13px] text-[var(--hz-text-muted)]">{humanize(item.definition_code)}</span>}
              </td>
              {!compact && <td className="text-right tabular-nums">{formatMoney(item.amount, item.currency, item.amount_reason)}</td>}
              <td className={compact ? '' : 'pl-8'}>
                <StackedCell value={<span className="font-medium tabular-nums">{waitingFor(item.assigned_at)}</span>} detail={formatDateTime(item.assigned_at)} />
              </td>
              <RowChevron />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const WorkQueuePage: React.FC = () => {
  const queue = useWorkQueue();
  const [search, setSearch] = useState('');
  const items = useMemo(() => queue.data?.results ?? [], [queue.data]);
  const query = search.trim().toLowerCase();
  const shown = query ? items.filter((item) => matches(item, query)) : items;

  const oldest = items.reduce<WorkQueueItem | null>(
    (first, item) => (item.assigned_at && (!first?.assigned_at || item.assigned_at < first.assigned_at) ? item : first),
    null,
  );
  const forColleagues = items.filter((item) => item.acting_for_user_id).length;
  const today = new Date().toDateString();
  const assignedToday = items.filter((item) => item.assigned_at && new Date(item.assigned_at).toDateString() === today).length;

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
        <StatGrid>
          <StatCard icon={Inbox} label="Waiting" value={items.length} caption="Approvals assigned to you" />
          <StatCard
            icon={CalendarClock}
            label="Assigned today"
            value={assignedToday}
            caption={assignedToday ? 'New since this morning' : 'Nothing new today'}
          />
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
        </StatGrid>
      )}

      <ListCard
        title="Tasks"
        description="Open a task to see what is being approved and decide it."
        toolbar={
          <>
            <SearchField
              id="task-search"
              label="Search tasks"
              value={search}
              onChange={setSearch}
              placeholder="Search record, stage or change"
              disabled={!queue.isSuccess || items.length === 0}
            />
            {queue.isSuccess && items.length > 0 && (
              <span className="text-[13px] text-[var(--hz-text-muted)]">
                {query ? `Showing ${shown.length} of ${items.length}` : `${items.length} ${items.length === 1 ? 'task' : 'tasks'}`}
              </span>
            )}
          </>
        }
      >
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
          <EmptyState icon={Inbox} title={EMPTY_QUEUE_TEXT} hint="New approvals assigned to you appear here." />
        )}
        {queue.isSuccess && items.length > 0 && shown.length === 0 && (
          <EmptyState icon={Inbox} title={`No tasks match “${search.trim()}”.`} hint="Try a policy or endorsement number, a stage, or a benefit." />
        )}
        {shown.length > 0 && <TaskTable items={shown} />}
      </ListCard>
    </HorizonPage>
  );
};
