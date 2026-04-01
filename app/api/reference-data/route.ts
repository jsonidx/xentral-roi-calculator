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
    return NextResponse.json({ data: DEFAULTS, plans: [] });
  }
  try {
    const [referenceData, plans] = await Promise.all([
      prisma.referenceData.findMany(),
      prisma.xentralPlan.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);

    const result: Record<string, number> = {};
    for (const item of referenceData) {
      result[item.key] = item.value;
    }

    const plansArray = plans.map((p) => ({
      name: p.name,
      servicePackage: p.servicePackage,
      monthlyFee: p.monthlyFee,
      maxMonthlyRevenue: p.maxMonthlyRevenue,
      sortOrder: p.sortOrder,
    }));

    return NextResponse.json({
      data: Object.keys(result).length > 0 ? result : DEFAULTS,
      plans: plansArray,
    });
  } catch {
    return NextResponse.json({ data: DEFAULTS, plans: [] });
  }
}
