// Frontend/middleware.js
import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  const auth = req.headers.get('authorization') || '';
  const expU = process.env.NEXT_ADMIN_USER || '';
  const expP = process.env.NEXT_ADMIN_PASS || '';

  const [scheme, b64] = auth.split(' ');
  let u = '', p = '';
  if (scheme?.toLowerCase() === 'basic' && b64) {
    try { [u, p] = atob(b64).split(':'); } catch {}
  }

  if (u === expU && p === expP) return NextResponse.next();

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
  });
}

export const config = { matcher: ['/admin/:path*'] };
