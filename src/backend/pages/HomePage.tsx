import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Building2, FileCheck2, Inbox, UserRound } from 'lucide-react';
import { Card, CardHeader, HorizonAlert, HorizonPage, HorizonPageContent, HorizonPageTitle, KeyValueGrid, StatCard } from '../../components/horizon';
import { useBranchStore } from '../../lib/context/branchStore';
import { useMe, usePermission } from '../../lib/auth/me';
import { POLICY_VIEW, TASK_VIEW } from '../permissions';
import { usePolicies } from '../policies/queries';
import { useWorkQueue } from '../workflow/queries';
import { changeSummary, humanize } from '../workflow/format';

/** Cards fill the row: three cards take thirds, four take quarters. */
const STAT_COLUMNS: Record<number, string> = { 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4' };

/** One metric card in the template's form: an icon chip, a label, a large figure and a caption. */

/** Backend mode's landing page: who is signed in, where, and what is waiting. Every figure comes from the server. */
export const HomePage: React.FC = () => {
  const me = useMe().data;
  const navigate = useNavigate();
  const branches = useBranchStore((state) => state.branches);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const canSeeTasks = usePermission(TASK_VIEW);
  const canSeePolicies = usePermission(POLICY_VIEW);
  const queue = useWorkQueue(canSeeTasks);
  const policies = usePolicies({ page: 1 }, canSeePolicies);
  if (!me) return null;

  const activeBranch = branches.find((branch) => branch.id === activeBranchId);
  const branchContext = activeBranch
    ? `${activeBranch.name} (${activeBranch.code})`
    : branches.length
      ? 'All my branches'
      : 'No branch assigned';
  const tasks = queue.data?.results ?? [];
  const pending = (query: { isError: boolean }) => (query.isError ? 'Unavailable' : '…');

  return (
    <HorizonPage id="backend-home">
      <HorizonPageTitle title="Home" subtitle={me.tenant.name} />

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${STAT_COLUMNS[2 + Number(canSeeTasks) + Number(canSeePolicies)]}`}>
        {canSeeTasks && (
          <StatCard
            icon={Inbox}
            label="Waiting for you"
            value={queue.data ? tasks.length : pending(queue)}
            caption={tasks.length ? 'Tasks you can act on now' : 'Nothing is waiting for you'}
          />
        )}
        {canSeePolicies && (
          <StatCard
            icon={FileCheck2}
            label="Policies you can see"
            value={typeof policies.data?.count === 'number' ? policies.data.count.toLocaleString('en-GB') : pending(policies)}
            caption="Within your branch access"
          />
        )}
        <StatCard
          icon={Building2}
          label="Branch context"
          value={activeBranch?.name ?? (branches.length ? 'All branches' : 'None')}
          caption={`${branches.length} branch${branches.length === 1 ? '' : 'es'} assigned`}
        />
        <StatCard icon={UserRound} label="Signed in as" value={me.user.email.split('@')[0]} caption={me.user.email} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {canSeeTasks && (
          <Card className="xl:col-span-2">
            <CardHeader
              title="Waiting for you"
              description="The latest tasks in your work queue"
              action={
                <button type="button" className="hz-button hz-button-secondary" onClick={() => navigate('/my-work/list')}>
                  Open My Work Queue
                  <ArrowRight className="h-4 w-4" />
                </button>
              }
            />
            {tasks.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[var(--hz-text-muted)]">
                {queue.isError ? 'Your work queue could not be loaded.' : 'Nothing is waiting for you.'}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--hz-border-grid)]">
                {tasks.slice(0, 5).map((task) => (
                  <li key={task.assignment_id} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{task.resource_reference ?? humanize(task.definition_code)}</span>
                      <span className="block truncate text-[13px] text-[var(--hz-text-muted)]">
                        {changeSummary(task.approval_facts, task.currency) ?? humanize(task.definition_code)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-[var(--hz-border-grid)] px-2 py-0.5 text-[13px] font-medium text-[var(--hz-text-secondary)]">
                      {task.stage_label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <HorizonPageContent className={`p-5 ${canSeeTasks ? '' : 'xl:col-span-3'}`}>
          <CardHeader title="Your access" description="What the server knows about this session" />
          <KeyValueGrid
            columns=""
            items={[
              { label: 'Signed in as', value: me.user.email },
              { label: 'Tenant', value: me.tenant.name },
              { label: 'Branch context', value: <span data-testid="branch-context">{branchContext}</span> },
              { label: 'Branches assigned', value: branches.length ? branches.map((branch) => branch.code).join(', ') : 'None' },
            ]}
          />
          {branches.length === 0 && (
            <div className="mt-4">
              <HorizonAlert tone="info" title="No branch assigned">
                Records that belong to a branch are not available to you until an administrator assigns you a branch.
              </HorizonAlert>
            </div>
          )}
          <p className="mt-4 text-[13px] text-[var(--hz-text-muted)]">
            The navigation shows the screens available to your account. The branch you choose is sent with your requests as
            context; what you can see and do is decided by your roles and branch access.
          </p>
        </HorizonPageContent>
      </div>
    </HorizonPage>
  );
};

export const NotFoundPage: React.FC = () => (
  <HorizonPage id="not-found">
    <HorizonPageTitle title="Page not found" />
    <HorizonPageContent className="p-6">
      <HorizonAlert tone="warning" title="Not found or not available to you">
        Use the navigation to open a screen.
      </HorizonAlert>
    </HorizonPageContent>
  </HorizonPage>
);
