import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const data = await prisma.referenceData.findMany();
    const result: Record<string, number> = {};
    for (const item of data) {
      result[item.key] = item.value;
    }
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error fetching reference data:', error);
    // Return defaults if DB not available
    return NextResponse.json({
      data: {
        error_reduction_factor: 0.90,
        oos_margin_factor: 0.30,
        default_aov: 50,
        default_hourly_rate: 35,
        default_error_reduction_xentral: 0.90,
      },
    });
  }
}
