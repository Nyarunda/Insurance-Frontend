import { useMemo } from 'react';
import { ModuleId } from '../data/roleRights';
import { NAV_GROUPS, NavGroup } from '../data/navigation';
import { useCanAccessApplication } from '../store/permissionStore';

/** Mock demo only: the navigation filtered by the mock Role Center rights. */
export function useMockNavGroups(): NavGroup[] {
  // Fixed set of hook calls (rules-of-hooks safe): a live permission snapshot per module.
  const moduleAccess: Record<ModuleId, boolean> = {
    customers: useCanAccessApplication('customers'),
    quotations: useCanAccessApplication('quotations'),
    policies: useCanAccessApplication('policies'),
    claims: useCanAccessApplication('claims'),
    billing: useCanAccessApplication('billing'),
    'reinsurance-treaties': useCanAccessApplication('reinsurance-treaties'),
    'product-studio': useCanAccessApplication('product-studio'),
    'regulatory-admin': useCanAccessApplication('regulatory-admin'),
    providers: useCanAccessApplication('providers'),
    intermediaries: useCanAccessApplication('intermediaries'),
    operations: useCanAccessApplication('operations'),
    reporting: useCanAccessApplication('reporting'),
  };
  const accessKey = JSON.stringify(moduleAccess);

  return useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const moduleId = item.moduleId ?? group.moduleId;
          return !moduleId || moduleAccess[moduleId];
        }),
      })).filter((group) => group.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accessKey],
  );
}
