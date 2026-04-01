import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  if (!prisma) {
    return NextResponse.json(
      { error: 'Datenbank nicht konfiguriert. Bitte kontaktiere den Administrator.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    const {
      name, email, company, phone, intent, partnerSource,
      monthlyRevenue, ordersPerMonth, oosRateCurrent, timePerOrderManual,
      aov, oosRateXentral, hourlyRate, timePerOrderXentral,
      pickErrorRate, costPerError, netAnnualSavings, roiPercent,
      timeGainPerMonth, recommendedPlan, monthlyPlanCost,
    } = body;

    if (!name || !email || !intent) {
      return NextResponse.json(
        { error: 'Name, E-Mail und Intent sind erforderlich.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse.' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        name, email,
        company: company || null,
        phone: phone || null,
        intent,
        partnerSource: partnerSource || null,
        monthlyRevenue: Number(monthlyRevenue) || 0,
        ordersPerMonth: Number(ordersPerMonth) || 0,
        oosRateCurrent: Number(oosRateCurrent) || 0,
        timePerOrderManual: Number(timePerOrderManual) || 0,
        aov: Number(aov) || 0,
        oosRateXentral: Number(oosRateXentral) || 0,
        hourlyRate: Number(hourlyRate) || 0,
        timePerOrderXentral: Number(timePerOrderXentral) || 0,
        pickErrorRate: Number(pickErrorRate) || 0,
        costPerError: Number(costPerError) || 0,
        netAnnualSavings: Number(netAnnualSavings) || 0,
        roiPercent: Number(roiPercent) || 0,
        timeGainPerMonth: Number(timeGainPerMonth) || 0,
        recommendedPlan: recommendedPlan || '',
        monthlyPlanCost: Number(monthlyPlanCost) || 0,
      },
    });

    return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
  } catch (error) {
    console.error('Error saving lead:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler. Bitte versuche es später erneut.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (!prisma) {
    return NextResponse.json({ error: 'Datenbank nicht konfiguriert.' }, { status: 503 });
  }
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Interner Serverfehler.' }, { status: 500 });
  }
}
