/**
 * My work (FI1-B): `GET /work-queue` only. Nothing is inferred from other data; a task is shown
 * while the server lists it. Refreshed by the button and whenever the user returns to the tab.
 *
 * DESIGN-1: the template's list page: metric cards over one card holding a search toolbar and the
 * table. The search only narrows what the server listed; it never adds or hides tasks otherwise.
 *
 * WFH-1: a **History** tab, `GET /workflows/my-history`: what the user decided ("Decided by me": their
 * approvals and rejections, with the reason and where each approval stands now) and what they asked
 * to be approved ("Requested by me"), past and pending, filtered by outcome and paged on the server.
 * Only the user's own; a row opens the approval. The tab, view, filter and page live in the URL.
 * WFH-1 R1: History is for every signed-in user, so a requester without `workflow.task.view` (a
 * renewal maker) finds what they asked for. Without it the page is History alone, opening on
 * "Requested by me": no queue, no counts, and `/work-queue` is never read.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CalendarClock, Clock3, FileText, History, Inbox, RefreshCw, UsersRound } from 'lucide-react';
import {
  DotTag,
  EmptyState,
  FilterGroup,
  StatusBadge,
  WorkspaceTabs,
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
import { HISTORY_PAGE_SIZE, useMyHistory, useWorkQueue } from '../workflow/queries';
import { hasPermission, useMe } from '../../lib/auth/me';
import { TASK_VIEW } from '../permissions';
import type { HistoryRow, WorkQueueItem } from '../workflow/types';

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

export const NO_HISTORY_TEXT = 'Nothing here yet';

const VIEWS = [
  { id: 'DECIDED', label: 'Decided by me' },
  { id: 'REQUESTED', label: 'Requested by me' },
];
const OUTCOMES = [
  { id: '', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'CLOSED', label: 'Closed' },
];
const STATUS_WORDS: Record<string, [string, 'neutral' | 'info' | 'success' | 'warning' | 'danger']> = {
  PENDING_APPROVAL: ['Pending', 'info'],
  REFERRED: ['Referred', 'info'],
  RETURNED_FOR_REWORK: ['Returned for rework', 'warning'],
  APPROVED: ['Approved', 'success'],
  REJECTED: ['Rejected', 'danger'],
  CANCELLED: ['Cancelled', 'neutral'],
  EXPIRED: ['Expired', 'neutral'],
  VOID: ['No longer applies', 'neutral'],
};

const HistoryTable: React.FC<{ rows: HistoryRow[]; decided: boolean }> = ({ rows, decided }) => {
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto">
      <table className="hz-grid w-full" aria-label={decided ? 'Decided by me' : 'Requested by me'}>
        <thead>
          <tr>
            <th>Record</th>
            <th>{decided ? 'My decision' : 'Asked'}</th>
            <th>Reason</th>
            <th>Now</th>
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const [words, tone] = STATUS_WORDS[row.status] ?? [humanize(row.status), 'neutral'];
            return (
              <tr key={`${row.workflow_instance_id}:${row.acted_at ?? row.submitted_at}`}
                {...openableRow(() => navigate(`/my-work/list/${encodeURIComponent(row.workflow_instance_id)}`))}>
                <td>
                  <RecordCell icon={FileText} title={`${humanize(row.resource_type)} ${row.resource_reference}`} detail={row.stage_label ?? row.definition_name} />
                </td>
                <td className="whitespace-nowrap">
                  {decided ? (
                    <StackedCell value={row.my_action === 'REJECT' ? 'Rejected' : 'Approved'} detail={formatDateTime(row.acted_at ?? null)} />
                  ) : (
                    <StackedCell value={row.definition_name} detail={formatDateTime(row.submitted_at ?? null)} />
                  )}
                </td>
                <td>{row.reason_label || row.reason_code ? <StackedCell value={row.reason_label ?? humanize(row.reason_code!)} detail={row.reason_text ?? undefined} /> : '—'}</td>
                <td>
                  <StatusBadge square label={words} tone={tone} />
                </td>
                <RowChevron />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const HistoryTab: React.FC<{ approver: boolean }> = ({ approver }) => {
  const [params, setParams] = useSearchParams();
  // An approver opens on what they decided; a requester on what they asked for.
  const fallback = approver ? 'DECIDED' : 'REQUESTED';
  const asked = params.get('view');
  const role = asked === 'REQUESTED' || asked === 'DECIDED' ? asked : fallback;
  const outcome = OUTCOMES.some((item) => item.id && item.id === params.get('outcome')) ? params.get('outcome') : null;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const history = useMyHistory(role, outcome, page);
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  };
  const data = history.data;
  const pages = data ? Math.max(1, Math.ceil(data.count / HISTORY_PAGE_SIZE)) : 1;
  return (
    <ListCard
      title="History"
      toolbar={
        <>
          <FilterGroup label="View" options={VIEWS} value={role} onChange={(id) => update({ view: id === fallback ? null : id, page: null })} />
          <FilterGroup label="Outcome" options={OUTCOMES} value={outcome ?? ''} onChange={(id) => update({ outcome: id || null, page: null })} />
        </>
      }
      footer={
        data && data.results.length > 0 ? (
          <>
            <span>
              Showing {data.results.length} of {data.count}
            </span>
            {pages > 1 && (
              <nav aria-label="Pages" className="flex items-center gap-2">
                <button type="button" className="hz-button hz-button-secondary" disabled={page <= 1} onClick={() => update({ page: page - 1 > 1 ? String(page - 1) : null })}>
                  Previous
                </button>
                <span className="text-[var(--hz-text-primary)]">
                  Page {page} of {pages}
                </span>
                <button type="button" className="hz-button hz-button-secondary" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>
                  Next
                </button>
              </nav>
            )}
          </>
        ) : undefined
      }
    >
      {history.isPending && (
        <div className="p-6">
          <HorizonLoader tip="Loading your history..." />
        </div>
      )}
      {history.isError && (
        <div className="p-4">
          <ApiErrorAlert error={history.error} title="Your history could not be loaded" />
        </div>
      )}
      {data && data.results.length === 0 && (
        <EmptyState icon={History} title={NO_HISTORY_TEXT}
          hint={role === 'DECIDED' ? 'Approvals and rejections you make appear here.' : 'Approvals you ask for appear here.'} />
      )}
      {data && data.results.length > 0 && <HistoryTable rows={data.results} decided={role === 'DECIDED'} />}
    </ListCard>
  );
};

const PAGE_TABS = [
  { id: 'queue', label: 'Waiting for me' },
  { id: 'history', label: 'History' },
];

export const WorkQueuePage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const approver = hasPermission(useMe().data, TASK_VIEW);
  const tab = !approver || params.get('tab') === 'history' ? 'history' : 'queue';
  const queue = useWorkQueue(approver);
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
        subtitle={!approver ? 'The approvals you asked for' : queue.isSuccess ? `${items.length} ${items.length === 1 ? 'task' : 'tasks'} waiting for you` : 'Approval tasks'}
        actions={
          approver && <button
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
      {approver && (
        <div className="px-4">
          <WorkspaceTabs tabs={PAGE_TABS} activeTab={tab} label="Work queue sections" variant="line"
            onChange={(next) => setParams(next === 'history' ? { tab: 'history' } : {})} />
        </div>
      )}
      {tab === 'history' && <HistoryTab approver={approver} />}

      {tab === 'queue' && queue.isSuccess && (
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

      {tab === 'queue' && (
      <ListCard
        title="Tasks"
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
      )}
    </HorizonPage>
  );
};
