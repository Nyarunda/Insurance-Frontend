import { useCallback } from 'react';
import { create } from 'zustand';

export const MODAL_IDS = {
  NEW_QUOTE: 'new-quote',
  NEW_CLAIM: 'new-claim',
  COLLECT_PAYMENT: 'collect-payment',
  NEW_USER: 'new-user',
  NEW_TENANT: 'new-tenant',
  NEW_BRANCH: 'new-branch',
  NEW_ACCOUNT: 'new-account',
  NEW_JOURNAL_ENTRY: 'new-journal-entry',
  NEW_LEAD: 'new-lead',
  NEW_CUSTOMER: 'new-customer',
  CONFIRM_DELETE: 'confirm-delete',
} as const;

interface ModalEntry {
  isOpen: boolean;
  data?: unknown;
}

interface ModalStoreState {
  modalsHashMap: Record<string, ModalEntry>;
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: (modalId: string) => void;
  closeAllModals: () => void;
}

const useModalStore = create<ModalStoreState>((set) => ({
  modalsHashMap: {},
  openModal: (modalId, data) =>
    set((state) => ({
      modalsHashMap: { ...state.modalsHashMap, [modalId]: { isOpen: true, data } },
    })),
  closeModal: (modalId) =>
    set((state) => {
      if (!state.modalsHashMap[modalId]) return state;
      return {
        modalsHashMap: { ...state.modalsHashMap, [modalId]: { isOpen: false } },
      };
    }),
  closeAllModals: () => set({ modalsHashMap: {} }),
}));

export function useModalWrapper<TData = undefined>(modalId: string) {
  const openModal = useModalStore((state) => state.openModal);
  const closeModal = useModalStore((state) => state.closeModal);
  const entry = useModalStore((state) => state.modalsHashMap[modalId]);

  const open = useCallback((data?: TData) => openModal(modalId, data), [modalId, openModal]);
  const close = useCallback(() => closeModal(modalId), [modalId, closeModal]);

  return {
    open,
    close,
    isOpen: entry?.isOpen ?? false,
    data: entry?.data as TData | undefined,
  };
}

export function useCloseAllModals() {
  return useModalStore((state) => state.closeAllModals);
}
