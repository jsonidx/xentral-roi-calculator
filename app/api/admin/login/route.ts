import { NextRequest, NextResponse } from 'next/server';
import { createToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin';
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Falsches Passwort.' }, { status: 401 });
    }

    const token = await createToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }
}
