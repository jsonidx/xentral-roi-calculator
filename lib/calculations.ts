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
}

export function getRecommendedPlan(monthlyRevenue: number): PlanInfo {
  if (monthlyRevenue < 500_000) {
    return {
      name: 'Xentral Starter',
      monthlyFee: 499,
      servicePackage: 'Standard M',
    };
  } else if (monthlyRevenue < 2_000_000) {
    return {
      name: 'Xentral Professional',
      monthlyFee: 999,
      servicePackage: 'Standard L',
    };
  } else {
    return {
      name: 'Xentral Enterprise',
      monthlyFee: 1999,
      servicePackage: 'Enterprise',
    };
  }
}

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
  const plan = getRecommendedPlan(monthlyRevenue);

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
  };
}

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
