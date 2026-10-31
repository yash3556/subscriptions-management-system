export type BillingFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface PlanFormValues {
  name: string;
  price: string;
  frequency: BillingFrequency | "";
  minimumQuantity: string;
  availableFrom: string;
  availableUntil: string;
  autoCloseAtEnd: boolean;
  allowEarlyClosure: boolean;
  allowPause: boolean;
  allowRenewal: boolean;
}

export interface PlanRecord {
  name: string;
  price: number;
  frequency: BillingFrequency;
  minimumQuantity: number;
  availableFrom?: string;
  availableUntil?: string;
  autoCloseAtEnd: boolean;
  allowEarlyClosure: boolean;
  allowPause: boolean;
  allowRenewal: boolean;
}
