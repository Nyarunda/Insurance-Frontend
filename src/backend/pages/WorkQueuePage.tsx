/**
 * My work (FI1-B): `GET /work-queue` only. Nothing is inferred from other data; a task is shown
 * while the server lists it. Refreshed by the button and whenever the user returns to the tab.
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { RefreshCw } from 'lucide-react';
import { HorizonLoader, HorizonPage, HorizonPageContent, HorizonPageTitle } from '../../components/horizon';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { formatDateTime, formatMoney, humanize } from '../workflow/format';
import { useWorkQueue } from '../workflow/queries';

export const EMPTY_QUEUE_TEXT = 'Nothing is waiting for you';

export const WorkQueuePage: React.FC = () => {
  const queue = useWorkQueue();
  const navigate = useNavigate();
  const items = queue.data?.results ?? [];

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
      <HorizonPageContent>
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
          <div className="p-6 text-center text-[13px] text-[var(--hz-text-secondary)]" role="status">
            {EMPTY_QUEUE_TEXT}
          </div>
        )}
        {queue.isSuccess && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="hz-grid w-full">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Record</th>
                  <th>Approval</th>
                  <th className="text-right">Amount</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.assignment_id}
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => navigate(`/my-work/${encodeURIComponent(item.workflow_instance_id)}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') navigate(`/my-work/${encodeURIComponent(item.workflow_instance_id)}`);
                    }}
                  >
                    <td className="font-semibold">
                      {item.stage_label}
                      {item.acting_for_user_id && (
                        <span className="ml-2 text-[13px] font-normal text-[var(--hz-text-secondary)]">for a colleague</span>
                      )}
                    </td>
                    <td>
                      {humanize(item.resource_type)}
                      {item.resource_reference ? ` ${item.resource_reference}` : ''}
                    </td>
                    <td>{humanize(item.definition_code)}</td>
                    <td className="text-right tabular-nums">{formatMoney(item.amount, item.currency, item.amount_reason)}</td>
                    <td>{formatDateTime(item.assigned_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HorizonPageContent>
    </HorizonPage>
  );
};
