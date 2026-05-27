import { NextRequest, NextResponse } from 'next/server';

const MOT_DE_PASSE = process.env.APP_PASSWORD ?? 'strate2026';
const COOKIE = 'strate_auth';

export function proxy(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE)?.value;

  if (cookie === MOT_DE_PASSE) return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (pathname === '/login') return NextResponse.next();

  if (pathname === '/api/login') {
    const pwd = req.nextUrl.searchParams.get('pwd') ?? '';
    if (pwd === MOT_DE_PASSE) {
      const res = NextResponse.redirect(new URL('/', req.url));
      res.cookies.set(COOKIE, MOT_DE_PASSE, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
      return res;
    }
    return NextResponse.redirect(new URL('/login?erreur=1', req.url));
  }

  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
