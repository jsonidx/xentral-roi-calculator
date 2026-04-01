export interface XentralPlanRow {
  id: string;
  planTier: 'starter' | 'business' | 'pro';
  servicePackage: string;
  minAnnualRevenue: number;
  maxAnnualRevenue: number | null;
  monthlyFeeMonthly: number;
  monthlyFeeAnnual: number;
  monthlyFee2Year: number;
  includedOrdersMonthly: number;
  includedOrdersAnnual: number;
  overage1To1000: number;
  overage1001To5000: number;
  overage5001To10000: number;
  sortOrder: number;
  isActive: boolean;
}

export interface PlanRecommendation {
  plan: XentralPlanRow;
  baseMonthlyFee: number;
  estimatedOrderCost: number;
  totalMonthlyFee: number;
  servicePackageName: string;
  planTierName: string;
  /** Savings per month versus the monthly-billing rate; 0 when billingCycle is 'monthly' */
  monthlySavingsVsMonthly: number;
}

export const SERVICE_PACKAGE_LABELS: Record<string, string> = {
  standard_s: 'Standard S',
  standard_m: 'Standard M',
  standard_l: 'Standard L',
  growth_s: 'Growth S',
  growth_m: 'Growth M',
  growth_l: 'Growth L',
  premium_s: 'Premium S',
  premium_l: 'Premium L',
};

export const PLAN_TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  business: 'Business',
  pro: 'Pro',
};

/** Ordered list of service packages for UI rendering */
export const SERVICE_PACKAGE_ORDER = [
  'standard_s',
  'standard_m',
  'standard_l',
  'growth_s',
  'growth_m',
  'growth_l',
  'premium_s',
] as const;

export type ServicePackageKey = (typeof SERVICE_PACKAGE_ORDER)[number];

export function getServicePackageLabel(sp: string): string {
  return SERVICE_PACKAGE_LABELS[sp] ?? sp;
}

export function getPlanTierLabel(tier: string): string {
  return PLAN_TIER_LABELS[tier] ?? tier;
}
