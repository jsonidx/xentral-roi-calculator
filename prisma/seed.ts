import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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

  const plans = [
    { name: 'Xentral Starter', servicePackage: 'Standard M', monthlyFee: 499, maxMonthlyRevenue: 500000, sortOrder: 1 },
    { name: 'Xentral Professional', servicePackage: 'Standard L', monthlyFee: 999, maxMonthlyRevenue: 2000000, sortOrder: 2 },
    { name: 'Xentral Enterprise', servicePackage: 'Enterprise', monthlyFee: 1999, maxMonthlyRevenue: null, sortOrder: 3 },
  ];

  for (const plan of plans) {
    const existing = await prisma.xentralPlan.findFirst({ where: { name: plan.name } });
    if (!existing) {
      await prisma.xentralPlan.create({ data: plan });
    }
  }

  console.log('Plans inserted successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
