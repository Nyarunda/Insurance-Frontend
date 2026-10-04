/**
 * The active branch (FI1-A). It is a context assertion, not an authorization boundary: the
 * backend decides data scope from the user's own role assignments and branch access.
 *
 * - The choice comes from `/me.branches`; with exactly one branch it is that one.
 * - It is remembered per user in localStorage as a convenience, and dropped when `/me` no longer
 *   lists it.
 * - It is sent as `X-Branch-ID`. When the backend answers `BRANCH_SCOPE_DENIED`, it is cleared.
 */

import { create } from 'zustand';

export interface BranchOption {
  id: string;
  code: string;
  name: string;
  scope: string;
}

export type BranchNotice = 'BRANCH_REJECTED' | null;

interface BranchState {
  userId: string | null;
  branches: BranchOption[];
  activeBranchId: string | null;
  /** Branches the backend refused in this session; never chosen again automatically. */
  rejectedIds: string[];
  notice: BranchNotice;
  hydrate: (userId: string, branches: BranchOption[]) => void;
  select: (branchId: string | null) => void;
  rejected: (branchId: string) => void;
  dismissNotice: () => void;
  reset: () => void;
}

export const branchStorageKey = (userId: string) => `insurance-cloud:branch:${userId}`;

const readStored = (userId: string): string | null => {
  try {
    return window.localStorage.getItem(branchStorageKey(userId));
  } catch {
    return null;
  }
};

const writeStored = (userId: string, branchId: string | null) => {
  try {
    if (branchId) window.localStorage.setItem(branchStorageKey(userId), branchId);
    else window.localStorage.removeItem(branchStorageKey(userId));
  } catch {
    // Storage unavailable: the choice just isn't remembered.
  }
};

export const useBranchStore = create<BranchState>((set, get) => ({
  userId: null,
  branches: [],
  activeBranchId: null,
  rejectedIds: [],
  notice: null,

  hydrate: (userId, branches) => {
    const sameUser = get().userId === userId;
    const rejectedIds = sameUser ? get().rejectedIds : [];
    const listed = (id: string | null) =>
      !!id && !rejectedIds.includes(id) && branches.some((branch) => branch.id === id);
    const current = sameUser ? get().activeBranchId : null;
    const stored = readStored(userId);
    let active: string | null = null;
    if (listed(current)) active = current;
    else if (listed(stored)) active = stored;
    else if (branches.length === 1 && listed(branches[0].id)) active = branches[0].id;
    if (stored && !listed(stored)) writeStored(userId, null);
    set({ userId, branches, activeBranchId: active, rejectedIds });
  },

  select: (branchId) => {
    const { userId, branches } = get();
    if (branchId && !branches.some((branch) => branch.id === branchId)) return;
    if (userId) writeStored(userId, branchId);
    set((state) => ({
      activeBranchId: branchId,
      notice: null,
      rejectedIds: branchId ? state.rejectedIds.filter((id) => id !== branchId) : state.rejectedIds,
    }));
  },

  rejected: (branchId) => {
    const { userId, activeBranchId, rejectedIds } = get();
    if (activeBranchId !== branchId) return;
    if (userId) writeStored(userId, null);
    set({ activeBranchId: null, rejectedIds: [...rejectedIds, branchId], notice: 'BRANCH_REJECTED' });
  },

  dismissNotice: () => set({ notice: null }),

  reset: () => set({ userId: null, branches: [], activeBranchId: null, rejectedIds: [], notice: null }),
}));

export const getActiveBranchId = (): string | null => useBranchStore.getState().activeBranchId;
