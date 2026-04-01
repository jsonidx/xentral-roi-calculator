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
    const data = await prisma.referenceData.findMany({ orderBy: { key: 'asc' } });
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Reference data GET error:', error);
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
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'Key erforderlich.' }, { status: 400 });
    }

    const entry = await prisma.referenceData.update({
      where: { key },
      data: { value: Number(value) },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Reference data PUT error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler.' }, { status: 500 });
  }
}
