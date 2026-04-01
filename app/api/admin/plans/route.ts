import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value ?? '';
  const valid = await verifyToken(token);
  if (!valid) {
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
  const token = request.cookies.get(COOKIE_NAME)?.value ?? '';
  const valid = await verifyToken(token);
  if (!valid) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }

  if (!prisma) {
    return NextResponse.json({ error: 'Datenbank nicht konfiguriert.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, name, servicePackage, monthlyFee, maxMonthlyRevenue } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID erforderlich.' }, { status: 400 });
    }

    const plan = await prisma.xentralPlan.update({
      where: { id },
      data: {
        name,
        servicePackage,
        monthlyFee: Number(monthlyFee),
        maxMonthlyRevenue: maxMonthlyRevenue != null ? Number(maxMonthlyRevenue) : null,
      },
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Plans PUT error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler.' }, { status: 500 });
  }
}
