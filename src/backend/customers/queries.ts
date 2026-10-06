/**
 * Customer server state (NB1-A). Lists, records and their sections come only from the backend,
 * which decides what the user may see: a customer out of scope is a 404 (`CUSTOMER_NOT_FOUND`),
 * never a substitute record, and a section the user may not see comes back as null.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/instance';
import type { Customer360, CustomerDetail, CustomerPage, CustomerType, IdentifierList, KycStatus } from './types';

export interface CustomerFilters {
  /** A customer number (exact), a name (contains), an e-mail or a phone (exact); the backend matches it. */
  q?: string;
  kyc_status?: KycStatus;
  customer_type?: CustomerType;
  page?: number;
}

export const CUSTOMER_PAGE_SIZE = 25;

export const CUSTOMER_KEYS = {
  all: ['customers'] as const,
  list: (filters: CustomerFilters) => ['customers', 'list', filters] as const,
  detail: (id: string) => ['customers', 'detail', id] as const,
  view360: (id: string) => ['customers', '360', id] as const,
  identifiers: (id: string) => ['customers', 'identifiers', id] as const,
};

export function useCustomers(filters: CustomerFilters, enabled = true) {
  return useQuery({
    queryKey: CUSTOMER_KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(filters.page ?? 1), page_size: String(CUSTOMER_PAGE_SIZE) });
      if (filters.q) params.set('q', filters.q);
      if (filters.kyc_status) params.set('kyc_status', filters.kyc_status);
      if (filters.customer_type) params.set('customer_type', filters.customer_type);
      return (await api.request<CustomerPage>(`/clients?${params}`)).data;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export interface LoadedCustomer {
  view: CustomerDetail;
  /** From the response header only: the customer PATCH sends it as If-Match (C1-D12). */
  etag: string | null;
}

export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: CUSTOMER_KEYS.detail(customerId),
    queryFn: async (): Promise<LoadedCustomer> => {
      const result = await api.request<CustomerDetail>(`/clients/${encodeURIComponent(customerId)}`);
      return { view: result.data, etag: result.etag };
    },
    enabled: !!customerId,
    staleTime: 0,
  });
}

export function useCustomer360(customerId: string) {
  return useQuery({
    queryKey: CUSTOMER_KEYS.view360(customerId),
    queryFn: async () => (await api.request<Customer360>(`/clients/${encodeURIComponent(customerId)}/360`)).data,
    enabled: !!customerId,
    staleTime: 0,
  });
}

export function useCustomerIdentifiers(customerId: string, enabled: boolean) {
  return useQuery({
    queryKey: CUSTOMER_KEYS.identifiers(customerId),
    queryFn: async () =>
      (await api.request<IdentifierList>(`/clients/${encodeURIComponent(customerId)}/identifiers`)).data,
    enabled: enabled && !!customerId,
    staleTime: 0,
  });
}
