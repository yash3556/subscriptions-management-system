export type SubscriptionStatus =
  | "draft"
  | "quotation"
  | "confirmed"
  | "active"
  | "paused"
  | "closed"
  | "expired";

export interface SubscriptionLine {
  product: string;
  quantity: number;
  unitPrice: number;
  taxes: string;
  amount: number;
}

export interface SubscriptionLineFormValue {
  product: string;
  quantity: string;
  unitPrice: string;
  taxes: string;
}

export interface SubscriptionFormValues {
  customer: string;
  plan: string;
  startDate: string;
  expiryDate: string;
  paymentTerms: string;
  lines: SubscriptionLineFormValue[];
}

export interface SubscriptionRecord {
  id: string;
  number: string;
  customer: string;
  plan: string;
  startDate: string;
  expiryDate: string;
  paymentTerms: string;
  status: SubscriptionStatus;
  nextBillingDate: string;
  lines: SubscriptionLine[];
}
