/**
 * Certificate server state (CS-A). The backend decides what the user may see: a policy or
 * certificate out of scope is a 404. ETags come only from response headers; none is ever built.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/instance';
import type { Certificate, CertificateList, CertificateType } from './types';

export const CERTIFICATE_KEYS = {
  all: ['certificates'] as const,
  forPolicy: (policyId: string) => ['certificates', 'policy', policyId] as const,
  detail: (id: string) => ['certificates', 'detail', id] as const,
  types: ['certificates', 'types'] as const,
  productClass: (productId: string) => ['certificates', 'product-class', productId] as const,
};

export function usePolicyCertificates(policyId: string, enabled: boolean) {
  return useQuery({
    queryKey: CERTIFICATE_KEYS.forPolicy(policyId),
    queryFn: async () =>
      (await api.request<CertificateList>(`/policies/${encodeURIComponent(policyId)}/certificates`)).data,
    enabled: enabled && !!policyId,
  });
}

export interface LoadedCertificate {
  view: Certificate;
  /** From the response header only; every command on the certificate sends it as If-Match. */
  etag: string | null;
}

export function useCertificate(certificateId: string | null) {
  return useQuery({
    queryKey: CERTIFICATE_KEYS.detail(certificateId ?? ''),
    queryFn: async (): Promise<LoadedCertificate> => {
      const result = await api.request<Certificate>(`/certificates/${encodeURIComponent(certificateId as string)}`);
      return { view: result.data, etag: result.etag };
    },
    enabled: !!certificateId,
    staleTime: 0,
  });
}

export function useCertificateTypes(enabled: boolean) {
  return useQuery({
    queryKey: CERTIFICATE_KEYS.types,
    queryFn: async () => (await api.request<{ results: CertificateType[] }>('/certificate-types')).data.results,
    enabled,
    staleTime: 60_000,
  });
}

/** The policy's insurance class, from its product (CS-D3: `GET /products/{id}` returns `insurance_class`). */
export function useProductClass(productId: string, enabled: boolean) {
  return useQuery({
    queryKey: CERTIFICATE_KEYS.productClass(productId),
    queryFn: async () =>
      (await api.request<{ id: string; insurance_class: { id: string; code: string; name?: string } }>(
        `/products/${encodeURIComponent(productId)}`,
      )).data.insurance_class,
    enabled: enabled && !!productId,
    staleTime: 5 * 60_000,
  });
}
