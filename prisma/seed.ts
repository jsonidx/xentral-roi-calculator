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

  console.log('Seed data inserted successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
