import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function authenticate(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value ?? '';
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  if (!await authenticate(request)) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }
  if (!prisma) {
    return NextResponse.json({ error: 'Datenbank nicht konfiguriert.' }, { status: 503 });
  }

  try {
    const plans = await prisma.xentralPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Plans GET error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!await authenticate(request)) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }
  if (!prisma) {
    return NextResponse.json({ error: 'Datenbank nicht konfiguriert.' }, { status: 503 });
  }

  try {
    const body = await request.json();

    // Bulk overage update: update all plans for a given tier at once
    if (body.updateManyByTier) {
      const { planTier, overage1To1000, overage1001To5000, overage5001To10000,
              includedOrdersMonthly, includedOrdersAnnual } = body;

      if (!planTier) {
        return NextResponse.json({ error: 'planTier erforderlich.' }, { status: 400 });
      }

      const data: Record<string, number> = {};
      if (overage1To1000    != null) data.overage1To1000    = Number(overage1To1000);
      if (overage1001To5000 != null) data.overage1001To5000 = Number(overage1001To5000);
      if (overage5001To10000 != null) data.overage5001To10000 = Number(overage5001To10000);
      if (includedOrdersMonthly != null) data.includedOrdersMonthly = Number(includedOrdersMonthly);
      if (includedOrdersAnnual  != null) data.includedOrdersAnnual  = Number(includedOrdersAnnual);

      await prisma.xentralPlan.updateMany({
        where: { planTier },
        data,
      });

      return NextResponse.json({ ok: true });
    }

    // Single plan update by id
    const { id, planTier, servicePackage, minAnnualRevenue, maxAnnualRevenue,
            monthlyFeeMonthly, monthlyFeeAnnual, monthlyFee2Year,
            includedOrdersMonthly, includedOrdersAnnual,
            overage1To1000, overage1001To5000, overage5001To10000,
            sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID erforderlich.' }, { status: 400 });
    }

    const plan = await prisma.xentralPlan.update({
      where: { id },
      data: {
        ...(planTier       != null && { planTier }),
        ...(servicePackage != null && { servicePackage }),
        ...(minAnnualRevenue  != null && { minAnnualRevenue:  Number(minAnnualRevenue)  }),
        ...(maxAnnualRevenue  !== undefined && { maxAnnualRevenue: maxAnnualRevenue != null ? Number(maxAnnualRevenue) : null }),
        ...(monthlyFeeMonthly != null && { monthlyFeeMonthly: Number(monthlyFeeMonthly) }),
        ...(monthlyFeeAnnual  != null && { monthlyFeeAnnual:  Number(monthlyFeeAnnual)  }),
        ...(monthlyFee2Year   != null && { monthlyFee2Year:   Number(monthlyFee2Year)   }),
        ...(includedOrdersMonthly != null && { includedOrdersMonthly: Number(includedOrdersMonthly) }),
        ...(includedOrdersAnnual  != null && { includedOrdersAnnual:  Number(includedOrdersAnnual)  }),
        ...(overage1To1000    != null && { overage1To1000:    Number(overage1To1000)    }),
        ...(overage1001To5000 != null && { overage1001To5000: Number(overage1001To5000) }),
        ...(overage5001To10000 != null && { overage5001To10000: Number(overage5001To10000) }),
        ...(sortOrder  != null && { sortOrder:  Number(sortOrder)  }),
        ...(isActive   != null && { isActive:   Boolean(isActive)  }),
      },
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Plans PUT error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await authenticate(request)) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }
  if (!prisma) {
    return NextResponse.json({ error: 'Datenbank nicht konfiguriert.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const {
      planTier, servicePackage, minAnnualRevenue, maxAnnualRevenue,
      monthlyFeeMonthly, monthlyFeeAnnual, monthlyFee2Year,
      includedOrdersMonthly, includedOrdersAnnual,
      overage1To1000, overage1001To5000, overage5001To10000,
      sortOrder,
    } = body;

    const required = { planTier, servicePackage, minAnnualRevenue,
                       monthlyFeeMonthly, monthlyFeeAnnual, monthlyFee2Year,
                       includedOrdersMonthly, includedOrdersAnnual,
                       overage1To1000, overage1001To5000, overage5001To10000 };

    for (const [key, val] of Object.entries(required)) {
      if (val == null) {
        return NextResponse.json({ error: `Pflichtfeld fehlt: ${key}` }, { status: 400 });
      }
    }

    const plan = await prisma.xentralPlan.create({
      data: {
        planTier,
        servicePackage,
        minAnnualRevenue:      Number(minAnnualRevenue),
        maxAnnualRevenue:      maxAnnualRevenue != null ? Number(maxAnnualRevenue) : null,
        monthlyFeeMonthly:     Number(monthlyFeeMonthly),
        monthlyFeeAnnual:      Number(monthlyFeeAnnual),
        monthlyFee2Year:       Number(monthlyFee2Year),
        includedOrdersMonthly: Number(includedOrdersMonthly),
        includedOrdersAnnual:  Number(includedOrdersAnnual),
        overage1To1000:        Number(overage1To1000),
        overage1001To5000:     Number(overage1001To5000),
        overage5001To10000:    Number(overage5001To10000),
        sortOrder:             Number(sortOrder ?? 0),
        isActive:              true,
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('Plans POST error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!await authenticate(request)) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }
  if (!prisma) {
    return NextResponse.json({ error: 'Datenbank nicht konfiguriert.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, hard } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID erforderlich.' }, { status: 400 });
    }

    if (hard) {
      await prisma.xentralPlan.delete({ where: { id } });
    } else {
      // Soft delete: mark as inactive
      await prisma.xentralPlan.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Plans DELETE error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler.' }, { status: 500 });
  }
}
