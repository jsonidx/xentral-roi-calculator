import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();
  const token = request.cookies.get(COOKIE_NAME)?.value ?? '';
  const valid = await verifyToken(token);
  if (!valid) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
