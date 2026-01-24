import { query } from "@/utils/neon";

type SessionResult = {
	sessionId: string;
	isNew: boolean;
};

export async function getOrCreateSession(req: Request): Promise<SessionResult> {
	// -----------------------------
	// 1. Read cookies safely
	// -----------------------------
	const cookieHeader = req.headers.get("cookie") ?? "";

	const cookies: Record<string, string> = Object.fromEntries(
		cookieHeader
			.split(";")
			.map((c) => c.trim())
			.filter(Boolean)
			.map((c) => {
				const [key, ...value] = c.split("=");
				return [key, decodeURIComponent(value.join("="))];
			})
	);

	const cookieSessionId = cookies["sessionId"];

	// -----------------------------
	// 2. Validate existing session
	// -----------------------------
	if (cookieSessionId) {
		const existing = await query(`SELECT id FROM jbs.client_sessions WHERE id = $1`, [cookieSessionId]);

		if (existing.rowCount && existing.rowCount > 0) {
			return { sessionId: cookieSessionId, isNew: false };
		}
	}

	// -----------------------------
	// 3. Create / upsert session
	// -----------------------------
	const forwardedFor = req.headers.get("x-forwarded-for");
	const ip = forwardedFor?.split(",")[0].trim() || req.headers.get("remote_addr") || "unknown";

	const userAgent = req.headers.get("user-agent") ?? "";
	const fingerprint = `${ip}:${userAgent}`;

	const result = await query<{ id: string; is_new: boolean }>(
		`INSERT INTO jbs.client_sessions (ip_address, user_agent, fingerprint)
     VALUES ($1, $2, $3)
     ON CONFLICT (fingerprint)
     DO UPDATE SET ip_address = EXCLUDED.ip_address
     RETURNING id, (xmax = 0) AS is_new`,
		[ip, userAgent, fingerprint]
	);

	return {
		sessionId: result.rows[0].id,
		isNew: result.rows[0].is_new,
	};
}
