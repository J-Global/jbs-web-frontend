import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

function isAdminLogin(pathname: string) {
	return pathname === "/admin/login" || pathname === "/admin/login/" || pathname === "/en/admin/login" || pathname === "/en/admin/login/";
}

function isAdminRoute(pathname: string) {
	return pathname === "/admin" || pathname === "/admin/" || pathname.startsWith("/admin/") || pathname === "/en/admin" || pathname === "/en/admin/" || pathname.startsWith("/en/admin/");
}

export default function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	// 1️⃣ Always allow admin login
	if (isAdminLogin(pathname)) {
		return intlMiddleware(req);
	}

	// 2️⃣ Protect admin routes
	const isLoggedIn = req.cookies.get("admin_session");

	if (isAdminRoute(pathname) && !isLoggedIn) {
		const isEnglish = pathname.startsWith("/en");
		const loginPath = isEnglish ? "/en/admin/login/" : "/admin/login/";

		return NextResponse.redirect(new URL(loginPath, req.url));
	}

	// 3️⃣ Everything else
	return intlMiddleware(req);
}

export const config = {
	matcher: ["/", "/en/:path*", "/admin/:path*", "/((?!_next|_vercel|api|.*\\..*).*)"],
};
