export type InvoiceStatus = "draft" | "confirmed" | "paid" | "cancelled";

export interface InvoiceLine {
  product: string;
  quantity: number;
  unitPrice: number;
  taxes: string;
  amount: number;
}

export interface InvoiceRecord {
  id: string;
  number: string;
  customer: string;
  subscriptionNumber: string;
  status: InvoiceStatus;
  dueDate?: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  outstanding: number;
}
