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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalLeads, monthLeads, allLeads] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.lead.findMany({
        select: {
          netAnnualSavings: true,
          roiPercent: true,
          recommendedPlan: true,
          createdAt: true,
          name: true,
          company: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const avgSavings =
      allLeads.length > 0
        ? allLeads.reduce((sum, l) => sum + l.netAnnualSavings, 0) / allLeads.length
        : 0;
    const avgROI =
      allLeads.length > 0
        ? allLeads.reduce((sum, l) => sum + l.roiPercent, 0) / allLeads.length
        : 0;

    // Plan distribution
    const planCount: Record<string, number> = {};
    for (const lead of allLeads) {
      const plan = lead.recommendedPlan || 'Unbekannt';
      planCount[plan] = (planCount[plan] ?? 0) + 1;
    }

    // Recent 10 leads
    const recentLeads = allLeads.slice(0, 10);

    return NextResponse.json({
      totalLeads,
      monthLeads,
      avgSavings: Math.round(avgSavings),
      avgROI: Math.round(avgROI),
      planDistribution: planCount,
      recentLeads,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler.' }, { status: 500 });
  }
}
