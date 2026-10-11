export const integrationCatalog = {
  categories: ['CORE_BANKING', 'EMAIL', 'SMS', 'PAYMENTS'],
  providers: [
    { code: 'BUSINESS_CENTRAL', name: 'Microsoft Dynamics 365 Business Central', categories: ['CORE_BANKING'], secret_label: 'Client secret', fields: [
      { name: 'directory_tenant_id', label: 'Microsoft Entra tenant ID' },
      { name: 'client_id', label: 'Application (client) ID' },
      { name: 'environment', label: 'Business Central environment' },
      { name: 'company_id', label: 'Company ID' },
    ] },
    { code: 'SMTP', name: 'SMTP email', categories: ['EMAIL'], secret_label: 'SMTP password', fields: [
      { name: 'host', label: 'SMTP host' }, { name: 'port', label: 'Port', type: 'number' },
      { name: 'username', label: 'Username' }, { name: 'sender_email', label: 'Sender email', type: 'email' },
      { name: 'security', label: 'Transport security', options: ['STARTTLS', 'TLS'] },
    ] },
    { code: 'HTTP_API', name: 'HTTP API', categories: ['CORE_BANKING', 'SMS', 'PAYMENTS'], secret_label: 'API credential', fields: [
      { name: 'base_url', label: 'HTTPS base URL', type: 'url' },
      { name: 'authentication', label: 'Authentication', options: ['BEARER', 'API_KEY', 'NONE'] },
      { name: 'api_key_header', label: 'API key header', optional: true },
    ] },
  ],
};

export const integrationConnection = {
  id: 'bc-connection', name: 'Core banking sandbox', provider: 'BUSINESS_CENTRAL', category: 'CORE_BANKING',
  configuration: {
    directory_tenant_id: '11111111-1111-4111-8111-111111111111', client_id: '22222222-2222-4222-8222-222222222222',
    company_id: '33333333-3333-4333-8333-333333333333', environment: 'Sandbox',
  },
  is_active: true, has_secret: true, connectivity: 'NOT_TESTED', etag: '"integration-bc-connection-1"', updated_at: '2026-10-11T10:00:00Z',
};
