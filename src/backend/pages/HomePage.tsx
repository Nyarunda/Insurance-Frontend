import React from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  Building2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FilePen,
  House,
  Inbox,
  Search,
  SearchX,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
} from 'lucide-react';
import {
  DetailGrid,
  EmptyState,
  HorizonAlert,
  HorizonPage,
  HorizonPageTitle,
  ListCard,
  openableRow,
  OutlineTag,
  RecordCell,
  RowChevron,
  StatCard,
  StatGrid,
  StatusBadge,
  StatusScreen,
} from '../../components/horizon';
import { useBranchStore } from '../../lib/context/branchStore';
import { useMe, usePermission } from '../../lib/auth/me';
import { CUSTOMER_CREATE, CUSTOMER_VIEW, ENDORSEMENT_CREATE, POLICY_VIEW, TASK_VIEW } from '../permissions';
import { COVERAGE_TONE } from '../policies/format';
import { usePolicies } from '../policies/queries';
import { policyHref } from '../policies/refs';
import { directoryReturnState } from '../policies/returnTo';
import { formatDateTime, humanize } from '../workflow/format';
import { useWorkQueue } from '../workflow/queries';
import { TaskTable, waitingFor } from './WorkQueuePage';

/** What the permissions let this person do, in words; the backend still decides every call. */
const PROFILES: { permission: string; label: string }[] = [
  { permission: TASK_VIEW, label: 'Approver' },
  { permission: ENDORSEMENT_CREATE, label: 'Endorsement maker' },
  { permission: POLICY_VIEW, label: 'Policy viewer' },
];

interface Shortcut {
  id: string;
  icon: React.ElementType;
  title: string;
  text: string;
  to: string;
}

/**
 * Backend mode's landing page, shaped by the permissions in /me: an approver sees what waits for
 * them, a maker how to change a policy, a policy viewer the book they can see. Every figure comes
 * from the server; nothing is shown that the permissions would refuse.
 */
export const HomePage: React.FC = () => {
  const me = useMe().data;
  const navigate = useNavigate();
  const branches = useBranchStore((state) => state.branches);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const canDecide = usePermission(TASK_VIEW);
  const canSeePolicies = usePermission(POLICY_VIEW);
  const canPrepare = usePermission(ENDORSEMENT_CREATE);
  const canSeeCustomers = usePermission(CUSTOMER_VIEW);
  const canAddCustomer = usePermission(CUSTOMER_CREATE);
  const queue = useWorkQueue(canDecide);
  const policies = usePolicies({ page: 1 }, canSeePolicies);
  const active = usePolicies({ coverage_status: 'ACTIVE', page: 1 }, canSeePolicies);
  if (!me) return null;

  const activeBranch = branches.find((branch) => branch.id === activeBranchId);
  const branchContext = activeBranch
    ? `${activeBranch.name} (${activeBranch.code})`
    : branches.length
      ? 'All my branches'
      : 'No branch assigned';
  const tasks = queue.data?.results ?? [];
  const oldest = tasks.reduce<(typeof tasks)[number] | null>(
    (first, item) => (item.assigned_at && (!first?.assigned_at || item.assigned_at < first.assigned_at) ? item : first),
    null,
  );
  const pending = (query: { isError: boolean }) => (query.isError ? 'Unavailable' : '…');
  const count = (query: { data?: { count: number }; isError: boolean }) =>
    typeof query.data?.count === 'number' ? query.data.count.toLocaleString('en-GB') : pending(query);
  const name = me.user.email.split('@')[0];
  const profiles = PROFILES.filter((profile) => me.permissions.includes(profile.permission));

  // The cards this person can use, in order; the branch and the account fill the row to four.
  const cards: React.ReactNode[] = [];
  if (canDecide) {
    cards.push(
      <StatCard
        key="waiting"
        icon={Inbox}
        label="Waiting for you"
        value={queue.data ? tasks.length : pending(queue)}
        caption={tasks.length ? 'Approvals you can decide now' : 'Nothing is waiting for you'}
      />,
      <StatCard
        key="oldest"
        icon={Clock3}
        label="Oldest task"
        value={oldest ? waitingFor(oldest.assigned_at) : '—'}
        caption={oldest ? `Assigned ${formatDateTime(oldest.assigned_at)}` : 'No tasks'}
      />,
    );
  }
  if (canSeePolicies) {
    cards.push(
      <StatCard key="active" icon={ShieldCheck} label="Active policies" value={count(active)} caption="In cover now, in your branches" />,
      <StatCard key="policies" icon={FileCheck2} label="Policies you can see" value={count(policies)} caption="Within your branch access" />,
    );
  }
  if (cards.length < 4) {
    cards.push(
      <StatCard
        key="branch"
        icon={Building2}
        label="Branch context"
        value={activeBranch?.name ?? (branches.length ? 'All branches' : 'None')}
        caption={`${branches.length} branch${branches.length === 1 ? '' : 'es'} assigned`}
      />,
    );
  }
  if (cards.length < 4) {
    cards.push(<StatCard key="me" icon={UserRound} label="Signed in as" value={name} caption={me.user.email} />);
  }

  const shortcuts: Shortcut[] = [
    ...(canDecide
      ? [{ id: 'decide', icon: ClipboardCheck, title: 'Decide approvals', text: 'Review what is asked and approve or reject it.', to: '/my-work/list' }]
      : []),
    ...(canPrepare && canSeePolicies
      ? [{ id: 'change', icon: FilePen, title: 'Change a policy', text: 'Open an active policy, then New endorsement on its Endorsements tab.', to: '/policies/list?coverage=ACTIVE' }]
      : []),
    ...(canAddCustomer
      ? [{ id: 'new-customer', icon: UserPlus, title: 'Add a customer', text: 'Create a customer, then complete their KYC.', to: '/customers/list/new' }]
      : []),
    ...(canSeeCustomers
      ? [{ id: 'customers', icon: UsersRound, title: 'Find a customer', text: 'Search customers by name, number, phone or e-mail.', to: '/customers/list' }]
      : []),
    ...(canSeePolicies
      ? [{ id: 'find', icon: Search, title: 'Find a policy', text: 'Search the policies in your branches by number.', to: '/policies/list' }]
      : []),
  ];

  const recent = policies.data?.results?.slice(0, 5) ?? [];

  return (
    <HorizonPage id="backend-home">
      <HorizonPageTitle
        title="Home"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>
              Welcome, {name} · {me.tenant.name}
            </span>
            {profiles.length > 0 && (
              <span className="flex flex-wrap gap-1.5" aria-label="What you can do">
                {profiles.map((profile) => (
                  <OutlineTag key={profile.permission}>{profile.label}</OutlineTag>
                ))}
              </span>
            )}
          </span>
        }
      />

      <StatGrid>{cards.slice(0, 4)}</StatGrid>

      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {canDecide ? (
            <ListCard
              title="Waiting for you"
              description="The latest tasks in your work queue"
              actions={
                <button type="button" className="hz-button hz-button-secondary" onClick={() => navigate('/my-work/list')}>
                  Open My Work Queue
                  <ArrowRight className="h-4 w-4" />
                </button>
              }
            >
              {tasks.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  role="note"
                  title={queue.isError ? 'Your work queue could not be loaded.' : 'Nothing is waiting for you.'}
                  hint={queue.isError ? undefined : 'New approvals assigned to you appear here.'}
                />
              ) : (
                <TaskTable items={tasks.slice(0, 5)} compact />
              )}
            </ListCard>
          ) : canSeePolicies ? (
            <ListCard
              title="Policies"
              description="The first policies in your branches"
              actions={
                <button type="button" className="hz-button hz-button-secondary" onClick={() => navigate('/policies/list')}>
                  Open Policy Directory
                  <ArrowRight className="h-4 w-4" />
                </button>
              }
            >
              {recent.length === 0 ? (
                <EmptyState
                  icon={FileCheck2}
                  role="note"
                  title={policies.isError ? 'Policies could not be loaded.' : 'No policies to show yet.'}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="hz-grid w-full" aria-label="Policies">
                    <thead>
                      <tr>
                        <th>Policy</th>
                        <th>Product</th>
                        <th>Coverage</th>
                        <th aria-hidden="true" />
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((policy) => (
                        <tr
                          key={policy.id}
                          {...openableRow(() =>
                            navigate(policyHref(policy.policy_no), { state: directoryReturnState('/policies/list', '') }),
                          )}
                        >
                          <td>
                            <RecordCell icon={ShieldCheck} mono title={policy.policy_no} detail={policy.customer.display_name} />
                          </td>
                          <td>{policy.product.name}</td>
                          <td>
                            <StatusBadge square label={humanize(policy.coverage_status)} tone={COVERAGE_TONE[policy.coverage_status] ?? 'neutral'} />
                          </td>
                          <RowChevron />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ListCard>
          ) : (
            <ListCard title="Your work" bare>
              <EmptyState
                icon={House}
                role="note"
                title="No work screens are open to you yet"
                hint="Your account has no permission for a work screen. Ask your administrator if you need one."
              />
            </ListCard>
          )}
        </div>

        <div className="flex flex-col gap-4 md:gap-6">
          {shortcuts.length > 0 && (
            <ListCard title="What you can do" description="Shortcuts for your permissions" bare>
              <ul className="flex flex-col divide-y divide-[var(--hz-divider)]">
                {shortcuts.map((shortcut) => (
                  <li key={shortcut.id}>
                    <button
                      type="button"
                      onClick={() => navigate(shortcut.to)}
                      className="group flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--hz-border-grid)] bg-[var(--hz-surface-subtle)] text-[var(--hz-text-secondary)]">
                        <shortcut.icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[var(--hz-text-primary)]">{shortcut.title}</span>
                        <span className="block text-[13px] text-[var(--hz-text-muted)]">{shortcut.text}</span>
                      </span>
                      <ChevronRight aria-hidden="true" className="size-4 text-[var(--hz-text-muted)] transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </ListCard>
          )}

          <ListCard title="Your access" description="What the server knows about this session" bare>
            <div className="space-y-4">
              <DetailGrid
                columns={1}
                items={[
                  { label: 'Signed in as', value: me.user.email },
                  { label: 'Tenant', value: me.tenant.name },
                  { label: 'Branch context', value: <span data-testid="branch-context">{branchContext}</span> },
                  { label: 'Branches assigned', value: branches.length ? branches.map((branch) => branch.code).join(', ') : 'None' },
                ]}
              />
              {branches.length === 0 && (
                <HorizonAlert tone="info" title="No branch assigned">
                  Records that belong to a branch are not available to you until an administrator assigns you a branch.
                </HorizonAlert>
              )}
              <p className="text-[13px] text-[var(--hz-text-muted)]">
                The navigation and this page show what your permissions allow. What you can see and do is decided by your
                roles and branch access on the server.
              </p>
            </div>
          </ListCard>
        </div>
      </div>
    </HorizonPage>
  );
};

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <HorizonPage id="not-found">
      <HorizonPageTitle title="Page not found" />
      <StatusScreen
        icon={SearchX}
        title="Not found or not available to you"
        description="The address does not lead to a screen you can open. Use the navigation, or start from Home."
        actions={
          <button type="button" className="hz-button hz-button-primary" onClick={() => navigate('/')}>
            <House className="h-3.5 w-3.5" />
            Go to Home
          </button>
        }
      />
    </HorizonPage>
  );
};
