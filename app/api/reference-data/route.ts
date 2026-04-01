import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const DEFAULTS = {
  error_reduction_factor: 0.90,
  oos_margin_factor: 0.30,
  default_aov: 50,
  default_hourly_rate: 35,
  default_error_reduction_xentral: 0.90,
};

export async function GET() {
  if (!prisma) {
    return NextResponse.json({ data: DEFAULTS, plans: [], planMatrix: [] });
  }
  try {
    const [referenceData, allPlans] = await Promise.all([
      prisma.referenceData.findMany(),
      prisma.xentralPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const result: Record<string, number> = {};
    for (const item of referenceData) {
      result[item.key] = item.value;
    }

    // Full plan matrix for the calculator frontend
    const planMatrix = allPlans.map((p) => ({
      id: p.id,
      planTier: p.planTier,
      servicePackage: p.servicePackage,
      minAnnualRevenue: p.minAnnualRevenue,
      maxAnnualRevenue: p.maxAnnualRevenue,
      monthlyFeeMonthly: p.monthlyFeeMonthly,
      monthlyFeeAnnual: p.monthlyFeeAnnual,
      monthlyFee2Year: p.monthlyFee2Year,
      includedOrdersMonthly: p.includedOrdersMonthly,
      includedOrdersAnnual: p.includedOrdersAnnual,
      overage1To1000: p.overage1To1000,
      overage1001To5000: p.overage1001To5000,
      overage5001To10000: p.overage5001To10000,
      sortOrder: p.sortOrder,
      isActive: p.isActive,
    }));

    // Legacy plans[] — business tier, annual billing, for backward compat
    // (partner white-labels and old calculator embed use this directly)
    const businessPlans = allPlans
      .filter((p) => p.planTier === 'business')
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const legacyPlans = businessPlans.map((p) => ({
      name: `Xentral Business – ${servicePackageLabel(p.servicePackage)}`,
      servicePackage: p.servicePackage,
      monthlyFee: p.monthlyFeeAnnual,
      // Convert annual revenue threshold to monthly for legacy getRecommendedPlan()
      maxMonthlyRevenue: p.maxAnnualRevenue != null ? p.maxAnnualRevenue / 12 : null,
      sortOrder: p.sortOrder,
    }));

    return NextResponse.json({
      data: Object.keys(result).length > 0 ? result : DEFAULTS,
      plans: legacyPlans,
      planMatrix,
    });
  } catch {
    return NextResponse.json({ data: DEFAULTS, plans: [], planMatrix: [] });
  }
}

function servicePackageLabel(sp: string): string {
  const labels: Record<string, string> = {
    standard_s: 'Standard S',
    standard_m: 'Standard M',
    standard_l: 'Standard L',
    growth_s: 'Growth S',
    growth_m: 'Growth M',
    growth_l: 'Growth L',
    premium_s: 'Premium S',
    premium_l: 'Premium L',
  };
  return labels[sp] ?? sp;
}
