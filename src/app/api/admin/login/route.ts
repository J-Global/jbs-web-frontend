export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";

function sha256(value: string) {
	return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(req: Request) {
	const { password } = await req.json();

	const isValid = sha256(password) === process.env.ADMIN_PASSWORD;
	if (!isValid) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	const res = NextResponse.json({ success: true });

	res.cookies.set("admin_session", "true", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	});

	return res;
}
