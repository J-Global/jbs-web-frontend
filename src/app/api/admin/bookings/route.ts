import { cookies } from "next/headers";
import { query } from "@/utils/neon";

export async function GET() {
	const session = (await cookies()).get("admin_session")?.value;

	if (session !== process.env.ADMIN_SESSION_SECRET) {
		return new Response("Unauthorized", { status: 401 });
	}

	const { rows } = await query(`
		SELECT
			id,
			first_name,
			last_name,
			email,
			phone_number,
			message,
			event_date,
			created_at
		FROM jbs.bookings
		ORDER BY event_date DESC
	`);

	return Response.json(rows);
}
