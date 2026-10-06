/**
 * Readable customer addresses (NB1-A, NB-D2): `/customers/list/CUS0000001`. A customer number is
 * resolved through `GET /clients?q=` (an exact number match, within the user's access); a number
 * the user cannot see is "not found", exactly as an ID would be. The page receives the ID, so its
 * queries, ETags and commands are unchanged. Old links with an ID keep working.
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
import type { CustomerPage } from './types';

export const CUSTOMERS_PATH = '/customers/list';
export const customerHref = (customerRef: string) => `${CUSTOMERS_PATH}/${encodeURIComponent(customerRef)}`;

const CustomerIdContext = createContext<string | null>(null);

/** The customer ID behind the address; outside a `CustomerRefRoute` the address's own value. */
export function useCustomerId(): string {
  const params = useParams();
  return useContext(CustomerIdContext) ?? params.customerId ?? '';
}

function useCustomerIdByNumber(ref: string) {
  return useQuery({
    queryKey: ['customers', 'by-number', ref],
    queryFn: async () => {
      const params = new URLSearchParams({ q: ref, page: '1', page_size: '5' });
      const page = (await api.request<CustomerPage>(`/clients?${params}`)).data;
      return page.results.find((customer) => customer.customer_no === ref.toUpperCase())?.id ?? null;
    },
    enabled: !isId(ref),
    staleTime: 5 * 60_000,
  });
}

export const CustomerNotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <HorizonPage id="not-found">
      <HorizonPageTitle title="Customer" />
      <StatusScreen
        icon={SearchX}
        title={NOT_FOUND_TEXT}
        description="The customer does not exist, or it is outside the branches you can see."
        actions={
          <button type="button" className="hz-button hz-button-secondary" onClick={() => navigate(CUSTOMERS_PATH)}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Customers
          </button>
        }
      />
    </HorizonPage>
  );
};

export const CustomerRefRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { customerId: ref = '' } = useParams();
  const byNumber = useCustomerIdByNumber(ref);
  if (isId(ref)) return <CustomerIdContext.Provider value={ref}>{children}</CustomerIdContext.Provider>;
  if (byNumber.isPending) return <HorizonLoader tip="Loading the customer..." />;
  if (byNumber.isError) return <ApiErrorAlert error={byNumber.error} title="The customer could not be loaded" />;
  if (!byNumber.data) return <CustomerNotFound />;
  return <CustomerIdContext.Provider value={byNumber.data}>{children}</CustomerIdContext.Provider>;
};
