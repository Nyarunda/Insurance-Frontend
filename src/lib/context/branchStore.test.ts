import { beforeEach, describe, expect, it } from 'vitest';
import { branchStorageKey, BranchOption, getActiveBranchId, useBranchStore } from './branchStore';

const NBO: BranchOption = { id: 'b-nbo', code: 'NBO', name: 'Nairobi', scope: 'OWN' };
const MSA: BranchOption = { id: 'b-msa', code: 'MSA', name: 'Mombasa', scope: 'OWN' };
const store = () => useBranchStore.getState();

beforeEach(() => store().reset());

describe('branch context', () => {
  it('defaults to the only branch', () => {
    store().hydrate('u1', [NBO]);
    expect(getActiveBranchId()).toBe('b-nbo');
  });

  it('chooses nothing ("all my branches") when there are several and no remembered choice', () => {
    store().hydrate('u1', [NBO, MSA]);
    expect(getActiveBranchId()).toBeNull();
  });

  it('has no context when no branch is assigned', () => {
    store().hydrate('u1', []);
    expect(getActiveBranchId()).toBeNull();
  });

  it('remembers the choice per user, as a convenience', () => {
    store().hydrate('u1', [NBO, MSA]);
    store().select('b-msa');
    expect(window.localStorage.getItem(branchStorageKey('u1'))).toBe('b-msa');

    store().reset();
    store().hydrate('u1', [NBO, MSA]);
    expect(getActiveBranchId()).toBe('b-msa');

    store().reset();
    store().hydrate('u2', [NBO, MSA]);
    expect(getActiveBranchId()).toBeNull();
  });

  it('drops a remembered branch that /me no longer lists', () => {
    window.localStorage.setItem(branchStorageKey('u1'), 'b-gone');
    store().hydrate('u1', [NBO, MSA]);
    expect(getActiveBranchId()).toBeNull();
    expect(window.localStorage.getItem(branchStorageKey('u1'))).toBeNull();
  });

  it('ignores a choice that is not one of the user’s branches', () => {
    store().hydrate('u1', [NBO, MSA]);
    store().select('b-other');
    expect(getActiveBranchId()).toBeNull();
  });

  it('clears the choice the backend refused and never picks it again automatically', () => {
    store().hydrate('u1', [NBO]);
    store().rejected('b-nbo');
    expect(getActiveBranchId()).toBeNull();
    expect(store().notice).toBe('BRANCH_REJECTED');
    expect(window.localStorage.getItem(branchStorageKey('u1'))).toBeNull();

    store().hydrate('u1', [NBO]); // /me refetched on focus
    expect(getActiveBranchId()).toBeNull();

    store().select('b-nbo'); // the user may still choose it deliberately
    expect(getActiveBranchId()).toBe('b-nbo');
    expect(store().notice).toBeNull();
  });

  it('ignores a refusal for a branch that is no longer the active one', () => {
    store().hydrate('u1', [NBO, MSA]);
    store().select('b-msa');
    store().rejected('b-nbo');
    expect(getActiveBranchId()).toBe('b-msa');
    expect(store().notice).toBeNull();
  });
});
