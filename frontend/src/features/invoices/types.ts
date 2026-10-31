export type InvoiceStatus = "Draft" | "Confirmed" | "Paid";

export interface InvoiceLine {
  product: string;
  quantity: number;
  unitPrice: number;
  taxes: string;
  amount: number;
}

export interface InvoiceRecord {
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
