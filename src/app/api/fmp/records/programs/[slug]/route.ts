import { NextRequest, NextResponse } from "next/server";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

//
const FILEMAKER_API_VERSION = "v1";

async function getToken() {
	if (cachedToken && Date.now() < tokenExpiresAt) {
		return cachedToken;
	}

	const { FILEMAKER_USER, FILEMAKER_PASS, FILEMAKER_URL, FILEMAKER_DB } = process.env;

	if (!FILEMAKER_USER || !FILEMAKER_PASS || !FILEMAKER_URL || !FILEMAKER_DB) {
		throw new Error("Missing one or more FileMaker environment variables.");
	}

	const auth = Buffer.from(`${FILEMAKER_USER}:${FILEMAKER_PASS?.replace(/\\n/g, "\n")}`).toString("base64");
	const sessionUrl = `${FILEMAKER_URL}/fmi/data/${FILEMAKER_API_VERSION}/databases/${FILEMAKER_DB}/sessions`;

	const res = await fetch(sessionUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
	});

	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(`Failed to get token: ${res.status} ${errorText}`);
	}

	const data = await res.json();
	if (!data?.response?.token) throw new Error(`Token missing in response: ${JSON.stringify(data)}`);

	cachedToken = data.response.token;
	tokenExpiresAt = Date.now() + 14 * 60 * 1000; // valid for 14 minutes

	return cachedToken;
}

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const pathSegments = url.pathname.split("/").filter(Boolean);
		const slug = pathSegments[pathSegments.length - 1];

		if (!slug) throw new Error("Missing 'slug' parameter in request URL.");

		const token = await getToken();

		const { FILEMAKER_URL, FILEMAKER_DB } = process.env;
		if (!FILEMAKER_URL || !FILEMAKER_DB) throw new Error("Missing FILEMAKER_URL or FILEMAKER_DB environment variable.");

		const body = {
			query: [{ LearningProgramCode: `=${slug.toUpperCase()}` }],
			sort: [{ fieldName: "LearningProgramNameE", sortOrder: "ascend" }],
		};

		const apiUrl = `${FILEMAKER_URL}/fmi/data/vLatest/databases/${FILEMAKER_DB}/layouts/LearningProgramApi/_find`;

		const res = await fetch(apiUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
			body: JSON.stringify(body),
		});

		const text = await res.text();
		let data;
		try {
			data = JSON.parse(text);
		} catch {
			throw new Error(`Failed to parse FileMaker response: ${text.slice(0, 200)}`);
		}

		if (!res.ok) {
			return NextResponse.json({
				error: "FileMaker API error",
				status: res.status,
				details: data,
			});
		}

		return NextResponse.json(data);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "An unexpected error occurred";

		return NextResponse.json({
			error: message,
			status: 500,
		});
	}
}
