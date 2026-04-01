import {
  XentralPlanRow,
  PlanRecommendation,
  getServicePackageLabel,
  getPlanTierLabel,
} from './types';

export interface CalculatorInputs {
  monthlyRevenue: number;
  aov: number;
  oosRateCurrent: number;   // percent, e.g. 5
  oosRateXentral: number;   // percent, e.g. 2
  timePerOrderManual: number; // minutes
  timePerOrderXentral: number; // minutes
  hourlyRate: number;
  pickErrorRate: number;    // percent, e.g. 2
  costPerError: number;
  errorReductionFactor: number; // e.g. 0.90
  oosMarginFactor: number;      // e.g. 0.30
  // Legacy flat plans (used when planMatrix is not available)
  plans?: (PlanInfo & { maxMonthlyRevenue?: number | null })[];
  // New full pricing matrix
  planMatrix?: XentralPlanRow[];
  planTier?: 'starter' | 'business' | 'pro';
  billingCycle?: 'monthly' | 'annual' | '2year';
}

export interface PlanInfo {
  name: string;
  monthlyFee: number;
  servicePackage: string;
}

export interface CalculatorResults {
  ordersPerMonth: number;
  timeCostCurrent: number;
  timeCostXentral: number;
  errorCostCurrent: number;
  errorCostXentral: number;
  barWithout: number;
  barWith: number;
  barChartMonthlySavings: number;
  oosSavingsMonthly: number;
  netMonthlySavings: number;
  netAnnualSavings: number;
  roiPercent: number;
  timeGainPerMonth: number;
  breakEvenMonths: number;
  plan: PlanInfo;
  planRecommendation?: PlanRecommendation;
}

// ── Legacy plan selector (flat plans array) ──────────────────────────────────

export function getRecommendedPlan(
  monthlyRevenue: number,
  plans?: (PlanInfo & { maxMonthlyRevenue?: number | null })[]
): PlanInfo {
  if (plans && plans.length > 0) {
    // Sort by maxMonthlyRevenue ascending (nulls last = enterprise/unlimited)
    const sorted = [...plans].sort((a, b) => {
      if (a.maxMonthlyRevenue == null) return 1;
      if (b.maxMonthlyRevenue == null) return -1;
      return a.maxMonthlyRevenue - b.maxMonthlyRevenue;
    });
    for (const plan of sorted) {
      if (plan.maxMonthlyRevenue == null || monthlyRevenue < plan.maxMonthlyRevenue) {
        return { name: plan.name, monthlyFee: plan.monthlyFee, servicePackage: plan.servicePackage };
      }
    }
    const last = sorted[sorted.length - 1];
    return { name: last.name, monthlyFee: last.monthlyFee, servicePackage: last.servicePackage };
  }
  // fallback hardcoded
  if (monthlyRevenue < 500_000) {
    return { name: 'Xentral Starter', monthlyFee: 499, servicePackage: 'Standard M' };
  } else if (monthlyRevenue < 2_000_000) {
    return { name: 'Xentral Professional', monthlyFee: 999, servicePackage: 'Standard L' };
  } else {
    return { name: 'Xentral Enterprise', monthlyFee: 1999, servicePackage: 'Enterprise' };
  }
}

// ── Tiered overage cost calculation ─────────────────────────────────────────

export function calculateOrderOverage(
  ordersPerMonth: number,
  includedOrders: number,
  rate1To1000: number,
  rate1001To5000: number,
  rate5001To10000: number
): number {
  const extra = Math.max(0, ordersPerMonth - includedOrders);
  if (extra === 0) return 0;

  let cost = 0;

  // Band 1: 1–1.000 extra orders
  const b1 = Math.min(extra, 1000);
  cost += b1 * rate1To1000;

  if (extra > 1000) {
    // Band 2: 1.001–5.000 extra orders
    const b2 = Math.min(extra - 1000, 4000);
    cost += b2 * rate1001To5000;
  }

  if (extra > 5000) {
    // Band 3: 5.001–10.000 extra orders (capped — above 10k is "on request")
    const b3 = Math.min(extra - 5000, 5000);
    cost += b3 * rate5001To10000;
  }

  return cost;
}

// ── New full-matrix plan selector ────────────────────────────────────────────

export function getRecommendedPlanDetails(
  monthlyRevenue: number,
  ordersPerMonth: number,
  planTier: 'starter' | 'business' | 'pro' = 'business',
  billingCycle: 'monthly' | 'annual' | '2year' = 'annual',
  plans: XentralPlanRow[]
): PlanRecommendation | null {
  const annualRevenue = monthlyRevenue * 12;

  const activePlans = plans.filter((p) => p.isActive && p.planTier === planTier);
  if (activePlans.length === 0) return null;

  const sorted = [...activePlans].sort((a, b) => a.minAnnualRevenue - b.minAnnualRevenue);

  let matched: XentralPlanRow | null = null;
  for (const p of sorted) {
    if (
      annualRevenue >= p.minAnnualRevenue &&
      (p.maxAnnualRevenue == null || annualRevenue < p.maxAnnualRevenue)
    ) {
      matched = p;
      break;
    }
  }

  // Fallback: highest package if revenue exceeds all defined bands
  if (!matched) matched = sorted[sorted.length - 1];
  if (!matched) return null;

  let baseMonthlyFee: number;
  let includedOrders: number;

  if (billingCycle === 'monthly') {
    baseMonthlyFee = matched.monthlyFeeMonthly;
    includedOrders = matched.includedOrdersMonthly;
  } else if (billingCycle === 'annual') {
    baseMonthlyFee = matched.monthlyFeeAnnual;
    includedOrders = matched.includedOrdersAnnual;
  } else {
    baseMonthlyFee = matched.monthlyFee2Year;
    includedOrders = matched.includedOrdersAnnual;
  }

  const estimatedOrderCost = calculateOrderOverage(
    ordersPerMonth,
    includedOrders,
    matched.overage1To1000,
    matched.overage1001To5000,
    matched.overage5001To10000
  );

  const totalMonthlyFee = baseMonthlyFee + estimatedOrderCost;

  // Savings versus paying month-to-month (base fee difference only)
  const monthlyBillingBaseFee = matched.monthlyFeeMonthly;
  const monthlySavingsVsMonthly =
    billingCycle === 'monthly' ? 0 : monthlyBillingBaseFee - baseMonthlyFee;

  return {
    plan: matched,
    baseMonthlyFee,
    estimatedOrderCost,
    totalMonthlyFee,
    servicePackageName: getServicePackageLabel(matched.servicePackage),
    planTierName: getPlanTierLabel(matched.planTier),
    monthlySavingsVsMonthly,
  };
}

// ── Core calculator ──────────────────────────────────────────────────────────

export function calculate(inputs: CalculatorInputs): CalculatorResults {
  const {
    monthlyRevenue,
    aov,
    oosRateCurrent,
    oosRateXentral,
    timePerOrderManual,
    timePerOrderXentral,
    hourlyRate,
    pickErrorRate,
    costPerError,
    errorReductionFactor,
    oosMarginFactor,
  } = inputs;

  const ordersPerMonth = aov > 0 ? monthlyRevenue / aov : 0;

  // Resolve plan — prefer new matrix when available
  let plan: PlanInfo;
  let planRecommendation: PlanRecommendation | undefined;

  if (inputs.planMatrix && inputs.planMatrix.length > 0) {
    const rec = getRecommendedPlanDetails(
      monthlyRevenue,
      ordersPerMonth,
      inputs.planTier ?? 'business',
      inputs.billingCycle ?? 'annual',
      inputs.planMatrix
    );
    if (rec) {
      planRecommendation = rec;
      plan = {
        name: `Xentral ${rec.planTierName} – ${rec.servicePackageName}`,
        monthlyFee: rec.totalMonthlyFee,
        servicePackage: rec.plan.servicePackage,
      };
    } else {
      plan = getRecommendedPlan(monthlyRevenue, inputs.plans);
    }
  } else {
    plan = getRecommendedPlan(monthlyRevenue, inputs.plans);
  }

  // Time costs
  const timeCostCurrent = (timePerOrderManual / 60) * ordersPerMonth * hourlyRate;
  const timeCostXentral = (timePerOrderXentral / 60) * ordersPerMonth * hourlyRate;

  // Error costs
  const errorCostCurrent = (pickErrorRate / 100) * ordersPerMonth * costPerError;
  const errorCostXentral = errorCostCurrent * (1 - errorReductionFactor);

  // Bar chart values
  const barWithout = timeCostCurrent + errorCostCurrent;
  const barWith = timeCostXentral + errorCostXentral + plan.monthlyFee;
  const barChartMonthlySavings = barWithout - barWith;

  // OOS savings
  const oosSavingsMonthly =
    ((oosRateCurrent - oosRateXentral) / 100) * monthlyRevenue * oosMarginFactor;

  // Total net monthly savings
  const netMonthlySavings = barChartMonthlySavings + oosSavingsMonthly;

  // Annual
  const netAnnualSavings = netMonthlySavings * 12;

  // ROI
  const annualPlanCost = plan.monthlyFee * 12;
  const roiPercent = annualPlanCost > 0 ? (netAnnualSavings / annualPlanCost) * 100 : 0;

  // Time gain per month (hours)
  const timeGainPerMonth = ((timePerOrderManual - timePerOrderXentral) / 60) * ordersPerMonth;

  // Break-even
  const grossMonthlySavings =
    timeCostCurrent - timeCostXentral +
    errorCostCurrent - errorCostXentral +
    oosSavingsMonthly;
  const breakEvenMonths = grossMonthlySavings > 0 ? annualPlanCost / grossMonthlySavings : 0;

  return {
    ordersPerMonth,
    timeCostCurrent,
    timeCostXentral,
    errorCostCurrent,
    errorCostXentral,
    barWithout,
    barWith,
    barChartMonthlySavings,
    oosSavingsMonthly,
    netMonthlySavings,
    netAnnualSavings,
    roiPercent,
    timeGainPerMonth,
    breakEvenMonths,
    plan,
    planRecommendation,
  };
}

// ── Formatting helpers ───────────────────────────────────────────────────────

export function formatEuro(value: number, decimals = 0): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value) + ' €';
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 0): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value) + '%';
}

export function breakEvenToMonthsDays(months: number): { months: number; days: number } {
  const wholeMonths = Math.floor(months);
  const remainingDays = Math.round((months - wholeMonths) * 30);
  return { months: wholeMonths, days: remainingDays };
}

export function generateBreakevenData(
  grossMonthlySavings: number,
  planMonthlyFee: number,
  numMonths = 12
): Array<{ month: number; savings: number; costs: number }> {
  const data = [];
  for (let i = 1; i <= numMonths; i++) {
    data.push({
      month: i,
      savings: Math.round(grossMonthlySavings * i),
      costs: Math.round(planMonthlyFee * i),
    });
  }
  return data;
}
