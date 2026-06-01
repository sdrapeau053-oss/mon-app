import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "strate_session";
const CHEMINS_PUBLICS = ["/login", "/api/login", "/_next", "/favicon.ico"];
const SESSION_MESSAGE = "strate-session-v1";

async function tokenAttendu(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(SESSION_MESSAGE));
  return Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (CHEMINS_PUBLICS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const attendu = await tokenAttendu();
  if (!attendu || cookie !== attendu) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
