import { NextResponse } from "next/server";

export async function POST() {
	const res = NextResponse.json({ success: true });

	res.cookies.set("admin_session", "", {
		path: "/",
		expires: new Date(0),
	});

	return res;
}
