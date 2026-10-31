export interface ProductVariant {
  attribute: string;
  value: string;
  additionalPrice: number;
}

export interface ProductFormValues {
  name: string;
  type: string;
  salesPrice: string;
  costPrice: string;
  notes: string;
  variants: ProductVariantFormValue[];
}

export interface ProductVariantFormValue {
  attribute: string;
  value: string;
  additionalPrice: string;
}

export interface ProductRecord {
  name: string;
  type: string;
  salesPrice: number;
  costPrice: number;
  notes?: string;
  variants: ProductVariant[];
}
