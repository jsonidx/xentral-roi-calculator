import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Monthly base prices per servicePackage × planTier (Monatsvertrag)
const MONTHLY_PRICES: Record<string, { starter: number; business: number; pro: number }> = {
  standard_s: { starter: 389,  business: 719,  pro: 939  },
  standard_m: { starter: 549,  business: 879,  pro: 1099 },
  standard_l: { starter: 769,  business: 1099, pro: 1319 },
  growth_s:   { starter: 989,  business: 1319, pro: 1539 },
  growth_m:   { starter: 1319, business: 1649, pro: 1869 },
  growth_l:   { starter: 1759, business: 2089, pro: 2309 },
  premium_s:  { starter: 2419, business: 2749, pro: 2969 },
};

// Annual revenue thresholds per service package
const REVENUE_BANDS: Record<string, { min: number; max: number | null }> = {
  standard_s: { min: 0,          max: 750_000    },
  standard_m: { min: 750_000,    max: 1_500_000  },
  standard_l: { min: 1_500_000,  max: 2_500_000  },
  growth_s:   { min: 2_500_000,  max: 5_000_000  },
  growth_m:   { min: 5_000_000,  max: 10_000_000 },
  growth_l:   { min: 10_000_000, max: 15_000_000 },
  premium_s:  { min: 15_000_000, max: 20_000_000 },
};

// Overage rates per plan tier (per extra order, monthly billing)
const OVERAGE_RATES: Record<string, { band1: number; band2: number; band3: number }> = {
  starter:  { band1: 0.25, band2: 0.25, band3: 0.25 },
  business: { band1: 0.20, band2: 0.17, band3: 0.15 },
  pro:      { band1: 0.20, band2: 0.17, band3: 0.15 },
};

// Included orders per plan tier
const INCLUDED_ORDERS: Record<string, { monthly: number; annual: number }> = {
  starter:  { monthly: 500,   annual: 500   }, // 6.000/year = 500/month
  business: { monthly: 1500,  annual: 1500  }, // 18.000/year = 1.500/month
  pro:      { monthly: 1500,  annual: 1500  }, // 18.000/year = 1.500/month
};

const PLAN_TIERS = ['starter', 'business', 'pro'] as const;
const SERVICE_PACKAGES = Object.keys(MONTHLY_PRICES);

async function main() {
  // ── Reference data ────────────────────────────────────────────────────────
  const referenceData = [
    {
      key: 'error_reduction_factor',
      value: 0.90,
      label: 'Fehlerreduktionsfaktor',
      description: 'Xentral reduziert Pick-Fehler um 90%',
    },
    {
      key: 'oos_margin_factor',
      value: 0.30,
      label: 'Out-of-Stock Margenfaktor',
      description: '30% des OOS-Umsatzverlusts ist erholbare Marge',
    },
    {
      key: 'default_aov',
      value: 50,
      label: 'Standard Warenkorbwert (AOV)',
      description: 'Standardmäßiger durchschnittlicher Bestellwert in Euro',
    },
    {
      key: 'default_hourly_rate',
      value: 35,
      label: 'Standard Stundensatz',
      description: 'Standardmäßiger Mitarbeiter-Stundensatz in Euro',
    },
    {
      key: 'default_error_reduction_xentral',
      value: 0.90,
      label: 'Standard Fehlerreduktion Xentral',
      description: 'Standard Fehlerreduktionsrate durch Xentral',
    },
  ];

  for (const data of referenceData) {
    await prisma.referenceData.upsert({
      where: { key: data.key },
      update: data,
      create: data,
    });
  }

  console.log('Reference data inserted successfully');

  // ── Full pricing matrix: 7 service packages × 3 plan tiers = 21 rows ─────
  let sortOrder = 0;

  for (const sp of SERVICE_PACKAGES) {
    const band = REVENUE_BANDS[sp];
    const prices = MONTHLY_PRICES[sp];

    for (const tier of PLAN_TIERS) {
      sortOrder++;
      const baseMonthly = prices[tier];
      const annual2Yr   = OVERAGE_RATES[tier]; // reuse var name for clarity below
      const overage     = OVERAGE_RATES[tier];
      const included    = INCLUDED_ORDERS[tier];

      // Deterministic id: allows idempotent upserts without @@unique lookup
      const id = `${tier}_${sp}`;

      await prisma.xentralPlan.upsert({
        where: { id },
        update: {
          planTier:              tier,
          servicePackage:        sp,
          minAnnualRevenue:      band.min,
          maxAnnualRevenue:      band.max,
          monthlyFeeMonthly:     baseMonthly,
          monthlyFeeAnnual:      Math.round(baseMonthly * 0.95),
          monthlyFee2Year:       Math.round(baseMonthly * 0.90),
          includedOrdersMonthly: included.monthly,
          includedOrdersAnnual:  included.annual,
          overage1To1000:        overage.band1,
          overage1001To5000:     overage.band2,
          overage5001To10000:    overage.band3,
          sortOrder,
          isActive:              true,
        },
        create: {
          id,
          planTier:              tier,
          servicePackage:        sp,
          minAnnualRevenue:      band.min,
          maxAnnualRevenue:      band.max,
          monthlyFeeMonthly:     baseMonthly,
          monthlyFeeAnnual:      Math.round(baseMonthly * 0.95),
          monthlyFee2Year:       Math.round(baseMonthly * 0.90),
          includedOrdersMonthly: included.monthly,
          includedOrdersAnnual:  included.annual,
          overage1To1000:        overage.band1,
          overage1001To5000:     overage.band2,
          overage5001To10000:    overage.band3,
          sortOrder,
          isActive:              true,
        },
      });
    }
  }

  console.log(`Plans inserted successfully (${sortOrder} rows)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
