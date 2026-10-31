export interface CustomerFormValues {
  name: string;
  email: string;
  phone: string;
  billingAddress: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  billing_address?: Record<string, string>;
  billingAddress?: string;
  createdAt?: string;
}

export interface CustomerDetailsRecord extends CustomerSummary {
  billingAddress?: string;
}
