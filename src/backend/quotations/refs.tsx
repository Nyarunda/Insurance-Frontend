/**
 * Readable quotation addresses (NB1-B, NB-D2): `/quotations/list/QUO0000001`. A number is resolved
 * through `GET /quotations?q=` (an exact number match, within the user's access); one the user
 * cannot see is "not found", exactly as an ID would be. Old links with an ID keep working.
 */

import React, { createContext, useContext } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, SearchX } from 'lucide-react';
import { HorizonLoader, HorizonPage, HorizonPageTitle, StatusScreen } from '../../components/horizon';
import { NOT_FOUND_TEXT } from '../../lib/api/commandErrors';
import { api } from '../../lib/api/instance';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { isId } from '../policies/refs';
import type { QuotationPage } from './types';

export const QUOTATIONS_PATH = '/quotations/list';
export const quotationHref = (ref: string) => `${QUOTATIONS_PATH}/${encodeURIComponent(ref)}`;

const QuotationIdContext = createContext<string | null>(null);

export function useQuotationId(): string {
  const params = useParams();
  return useContext(QuotationIdContext) ?? params.quotationId ?? '';
}

export const QuotationRefRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { quotationId: ref = '' } = useParams();
  const byNumber = useQuery({
    queryKey: ['quotations', 'by-number', ref],
    queryFn: async () => {
      const params = new URLSearchParams({ q: ref, page: '1', page_size: '5' });
      const page = (await api.request<QuotationPage>(`/quotations?${params}`)).data;
      return page.results.find((item) => item.quotation_no === ref.toUpperCase())?.id ?? null;
    },
    enabled: !isId(ref),
    staleTime: 5 * 60_000,
  });
  if (isId(ref)) return <QuotationIdContext.Provider value={ref}>{children}</QuotationIdContext.Provider>;
  if (byNumber.isPending) return <HorizonLoader tip="Loading the quotation..." />;
  if (byNumber.isError) return <ApiErrorAlert error={byNumber.error} title="The quotation could not be loaded" />;
  if (!byNumber.data) {
    return (
      <HorizonPage id="not-found">
        <HorizonPageTitle title="Quotation" />
        <StatusScreen
          icon={SearchX}
          title={NOT_FOUND_TEXT}
          description="The quotation does not exist, or it is outside the branches you can see."
          actions={
            <button type="button" className="hz-button hz-button-secondary" onClick={() => navigate(QUOTATIONS_PATH)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Quotations
            </button>
          }
        />
      </HorizonPage>
    );
  }
  return <QuotationIdContext.Provider value={byNumber.data}>{children}</QuotationIdContext.Provider>;
};
