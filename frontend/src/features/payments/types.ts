export interface PaymentFormValues {
  invoiceNumber: string;
  method: string;
  amount: string;
  date: string;
  note: string;
}

export interface PaymentRecord {
  invoiceNumber: string;
  method: string;
  amount: number;
  date: string;
  note?: string;
}
