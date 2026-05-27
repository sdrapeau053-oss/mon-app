import { NextRequest, NextResponse } from 'next/server';

const MOT_DE_PASSE = process.env.APP_PASSWORD ?? 'strate2026';
const COOKIE = 'strate_auth';

export function GET(req: NextRequest) {
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
