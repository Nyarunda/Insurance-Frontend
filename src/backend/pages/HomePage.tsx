import React from 'react';
import { HorizonAlert, HorizonPage, HorizonPageContent, HorizonPageTitle, KeyValueGrid } from '../../components/horizon';
import { useBranchStore } from '../../lib/context/branchStore';
import { useMe } from '../../lib/auth/me';

/** Backend mode's landing page: who is signed in, where, and in which branch context. */
export const HomePage: React.FC = () => {
  const me = useMe().data;
  const branches = useBranchStore((state) => state.branches);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  if (!me) return null;

  const activeBranch = branches.find((branch) => branch.id === activeBranchId);
  const branchContext = activeBranch
    ? `${activeBranch.name} (${activeBranch.code})`
    : branches.length
      ? 'All my branches'
      : 'No branch assigned';

  return (
    <HorizonPage id="backend-home">
      <HorizonPageTitle title="Home" subtitle={me.tenant.name} />
      <HorizonPageContent className="p-5 space-y-4">
        <KeyValueGrid
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
        <p className="text-[12px] text-[var(--hz-text-secondary)]">
          The navigation shows the screens available to your account. The branch you choose is sent with your requests as
          context; what you can see and do is decided by your roles and branch access.
        </p>
      </HorizonPageContent>
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
