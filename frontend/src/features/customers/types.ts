export interface CustomerFormValues {
  name: string;
  email: string;
  phone: string;
  billingAddress: string;
}

export interface CustomerSummary {
  name: string;
  email: string;
  phone?: string;
  billingAddress?: string;
  createdAt?: string;
}

export interface CustomerDetailsRecord extends CustomerSummary {
  billingAddress?: string;
}
