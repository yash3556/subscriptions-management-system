export type QuotationItemType = "product" | "plan";

export interface QuotationLine {
  type: QuotationItemType;
  itemId: string;
  variantId: string;
  quantity: string;
}

export interface QuotationFormValues {
  customerId: string;
  validityDays: string;
  notes: string;
  lines: QuotationLine[];
}

export interface QuotationRecord extends QuotationFormValues {
  id: string;
  number: string;
  customerName: string;
  status: string;
  totalPaise: number;
  validUntil: string;
  sentAt?: string;
  customerAcceptedAt?: string;
}
