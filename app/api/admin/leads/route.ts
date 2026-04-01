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
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const search = searchParams.get('search') ?? '';
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { company: { contains: search, mode: 'insensitive' as const } },
            { partnerSource: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin leads error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler.' }, { status: 500 });
  }
}
