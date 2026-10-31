export interface RevenueDataPoint {
  period: string;
  revenue: number;
}

export interface SubscriptionDataPoint {
  status: string;
  count: number;
}

export interface ReportDateRange {
  from: string;
  to: string;
}
