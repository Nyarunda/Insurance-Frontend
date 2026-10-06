/**
 * Quotation and product server state (NB1-B). Everything shown comes from the backend: the
 * quotation with its ETag, the stored pricing snapshot (never recomputed here, NB-D4), and the
 * published product setup the risk form is built from (NB-D3).
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/instance';
import type {
  Offer,
  ProductSummary,
  ProductVersionDocument,
  ProductVersionSummary,
  QuotationDetail,
  QuotationPage,
  QuotationStatus,
} from './types';

export interface QuotationFilters {
  /** An exact quotation number. */
  q?: string;
  status?: QuotationStatus;
  customer_id?: string;
  page?: number;
}

export const QUOTATION_PAGE_SIZE = 25;

export const QUOTATION_KEYS = {
  all: ['quotations'] as const,
  list: (filters: QuotationFilters) => ['quotations', 'list', filters] as const,
  detail: (id: string) => ['quotations', 'detail', id] as const,
  offer: (id: string, revision: number) => ['quotations', 'offer', id, revision] as const,
};

export const PRODUCT_KEYS = {
  active: ['products', 'active'] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
  version: (productId: string, versionId: string) => ['products', 'version', productId, versionId] as const,
};

export function useQuotations(filters: QuotationFilters, enabled = true) {
  return useQuery({
    queryKey: QUOTATION_KEYS.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(filters.page ?? 1), page_size: String(QUOTATION_PAGE_SIZE) });
      if (filters.q) params.set('q', filters.q);
      if (filters.status) params.set('status', filters.status);
      if (filters.customer_id) params.set('customer_id', filters.customer_id);
      return (await api.request<QuotationPage>(`/quotations?${params}`)).data;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export interface LoadedQuotation {
  view: QuotationDetail;
  /** From the response header only: every quotation command sends it as If-Match. */
  etag: string | null;
}

export function useQuotation(quotationId: string) {
  return useQuery({
    queryKey: QUOTATION_KEYS.detail(quotationId),
    queryFn: async (): Promise<LoadedQuotation> => {
      const result = await api.request<QuotationDetail>(`/quotations/${encodeURIComponent(quotationId)}`);
      return { view: result.data, etag: result.etag };
    },
    enabled: !!quotationId,
    staleTime: 0,
  });
}

export function useOffer(quotationId: string, revisionNo: number | null) {
  return useQuery({
    queryKey: QUOTATION_KEYS.offer(quotationId, revisionNo ?? 0),
    queryFn: async () =>
      (await api.request<Offer>(`/quotations/${encodeURIComponent(quotationId)}/revisions/${revisionNo}/offer`)).data,
    enabled: !!quotationId && revisionNo !== null,
  });
}

/** Products a quotation can be made for: the server's ACTIVE products. */
export function useActiveProducts(enabled = true) {
  return useQuery({
    queryKey: PRODUCT_KEYS.active,
    queryFn: async () => (await api.request<{ results: ProductSummary[] }>('/products?status=ACTIVE')).data,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useProductDetail(productId: string, enabled = true) {
  return useQuery({
    queryKey: PRODUCT_KEYS.detail(productId),
    queryFn: async () =>
      (await api.request<ProductSummary & { versions: ProductVersionSummary[] }>(`/products/${encodeURIComponent(productId)}`)).data,
    enabled: enabled && !!productId,
    staleTime: 5 * 60_000,
  });
}

export function useProductVersion(productId: string, versionId: string | null) {
  return useQuery({
    queryKey: PRODUCT_KEYS.version(productId, versionId ?? ''),
    queryFn: async () =>
      (await api.request<ProductVersionDocument>(`/products/${encodeURIComponent(productId)}/versions/${versionId}`)).data,
    enabled: !!productId && !!versionId,
    staleTime: 5 * 60_000,
  });
}

const localDay = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * The published version in force on `day` (the form's guide only). The server prices with the
 * version in force on its own business date; if they ever differ, its answer is what counts.
 */
export function versionInForce(versions: ProductVersionSummary[], day = localDay()): ProductVersionSummary | null {
  return (
    versions
      .filter((v) => v.status === 'PUBLISHED' && v.effective_from !== null && v.effective_from <= day && (!v.effective_to || v.effective_to >= day))
      .sort((a, b) => b.version_no - a.version_no)[0] ?? null
  );
}
