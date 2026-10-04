import { LayoutDashboard } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { BACKEND_NAV, BackendNavGroup, pathForScreen, screenForPath, visibleNav } from './navigation';

const REGISTRY: BackendNavGroup[] = [
  {
    id: 'daily-desk',
    title: 'Daily Desk',
    icon: LayoutDashboard,
    items: [
      { screen: 'dashboard', label: 'Home', path: '/' },
      { screen: 'my-work', label: 'My work', path: '/my-work', permission: 'workflow.task.view' },
    ],
  },
  {
    id: 'policy-admin',
    title: 'Policy Admin',
    icon: LayoutDashboard,
    items: [{ screen: 'policies', label: 'Policies', path: '/policies', permission: 'policies.policy.view' }],
  },
];

describe('permission-driven navigation', () => {
  it('shows an item only when /me.permissions holds its permission', () => {
    const groups = visibleNav(REGISTRY, ['workflow.task.view']);
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([['dashboard', 'my-work']]);
  });

  it('drops a group with nothing visible', () => {
    expect(visibleNav(REGISTRY, []).map((group) => group.id)).toEqual(['daily-desk']);
  });

  it('shows everything the permissions allow', () => {
    expect(visibleNav(REGISTRY, ['workflow.task.view', 'policies.policy.view']).flatMap((group) => group.items)).toHaveLength(3);
  });

  it('maps screens and paths both ways, including record paths', () => {
    expect(pathForScreen('my-work', REGISTRY)).toBe('/my-work');
    expect(screenForPath('/policies', REGISTRY)).toBe('policies');
    expect(screenForPath('/policies/abc', REGISTRY)).toBe('policies');
    expect(screenForPath('/nowhere', REGISTRY)).toBeNull();
  });

  it('integrates Home and, with workflow.task.view, My Work Queue', () => {
    expect(BACKEND_NAV.flatMap((group) => group.items).map((item) => [item.screen, item.permission ?? null])).toEqual([
      ['dashboard', null],
      ['my-work', 'workflow.task.view'],
    ]);
  });
});
