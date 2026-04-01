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
    return NextResponse.json({ data: DEFAULTS });
  }
  try {
    const data = await prisma.referenceData.findMany();
    const result: Record<string, number> = {};
    for (const item of data) {
      result[item.key] = item.value;
    }
    return NextResponse.json({ data: Object.keys(result).length > 0 ? result : DEFAULTS });
  } catch {
    return NextResponse.json({ data: DEFAULTS });
  }
}
