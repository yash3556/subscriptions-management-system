export type QuotationLineType = "product" | "plan";

export interface QuotationLine {
  type: QuotationLineType;
  name: string;
}

export interface QuotationFormValues {
  customerName: string;
  templateName: string;
  validityDays: string;
  lines: QuotationLine[];
}

export interface QuotationRecord extends QuotationFormValues {
  number?: string;
}
