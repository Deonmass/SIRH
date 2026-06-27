import { NextResponse, type NextRequest } from "next/server";
import {
  canAccessApi,
  canAccessPage,
  firstAccessibleHref,
  isPublicApiPath,
} from "@/lib/auth/access-control";
import { ACTIVITY_ACTOR_HEADER } from "@/lib/activity-actor";
import { hydrateSessionUser } from "@/lib/auth/hydrate-session";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const PUBLIC_PAGE_PREFIXES = ["/login"];
const PUBLIC_API_PREFIXES = ["/api/auth/login"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return false;
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname === "/favicon.ico" ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname) || isPublicPath(pathname)) {
    if (pathname === "/login") {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (await parseSessionToken(token)) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  const identity = await parseSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!identity) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  const user = await hydrateSessionUser(identity);

  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next();
    }
    if (!canAccessApi(user, pathname, request.method)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(ACTIVITY_ACTOR_HEADER, user.username);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname === "/access-denied") {
    return NextResponse.next();
  }

  if (!canAccessPage(user, pathname)) {
    if (pathname === "/") {
      const fallback = firstAccessibleHref(user);
      if (fallback && fallback !== "/") {
        return NextResponse.redirect(new URL(fallback, request.url));
      }
    }
    return NextResponse.redirect(new URL("/access-denied", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
