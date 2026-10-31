export type DiscountType = "fixed" | "percentage";
export type DiscountTarget = "products" | "subscriptions";

export interface DiscountFormValues {
  name: string;
  type: DiscountType | "";
  value: string;
  minimumPurchase: string;
  minimumQuantity: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  target: DiscountTarget | "";
  eligibleProducts: string[];
}

export interface DiscountRecord {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  minimumPurchase?: number;
  minimumQuantity?: number;
  startsAt: string;
  endsAt: string;
  usageLimit?: number;
  target: DiscountTarget;
  eligibleProducts: string[];
  eligibleProductIds: string[];
  isActive: boolean;
  usedCount: number;
}
