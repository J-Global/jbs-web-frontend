import { NextResponse } from "next/server";
import { Resend } from "resend";
import { query } from "@/utils/neon";
import { getOrCreateSession } from "@/utils/db/getOrCreateSession";
import { Validators } from "@/app/utils/validation/validators";
import { ValidationError } from "@/app/utils/validation/ErrorValidator";

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { sanitizeEmailMessage } from "@/app/utils/sanitizeEmailMessage";

/* ----------------------------- Rate Limiting ----------------------------- */

const redis = Redis.fromEnv();

const limiter = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(5, "15 m"),
});

/* ------------------------------ Type Guards ------------------------------- */

interface ContactBody {
	firstName: unknown;
	lastName: unknown;
	email: unknown;
	message: unknown;
}

function isContactBody(value: unknown): value is ContactBody {
	return typeof value === "object" && value !== null && "firstName" in value && "lastName" in value && "email" in value && "message" in value;
}

/* -------------------------------- Handler -------------------------------- */

export async function POST(req: Request) {
	try {
		/* ---------- Content-Type ---------- */
		const contentType = req.headers.get("content-type") ?? "";
		if (!contentType.includes("application/json")) {
			return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
		}

		/* ---------- Parse JSON ---------- */
		let body: unknown;
		try {
			body = await req.json();
		} catch {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		/* ---------- Shape Guard ---------- */
		if (!isContactBody(body)) {
			return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
		}

		const { firstName, lastName, email, message } = body;

		/* ---------- Validation ---------- */
		Validators.required(firstName, "First name");
		Validators.string(firstName, "First name");

		Validators.required(lastName, "Last name");
		Validators.string(lastName, "Last name");

		Validators.required(email, "Email");
		Validators.email(email);

		Validators.required(message, "Message");
		Validators.minLength(message, 10, "Message");
		Validators.maxLength(message, 2000, "Message");

		/* ---------- Session ---------- */
		const { sessionId, isNew } = await getOrCreateSession(req);

		/* ---------- Rate Limit ---------- */
		const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

		const identifier = sessionId ?? ip ?? "anonymous";

		const { success } = await limiter.limit(identifier);

		if (!success) {
			return NextResponse.json({ error: "Too many messages. Please wait 15 minutes and try again." }, { status: 429 });
		}

		/* ---------- Store (RAW data is correct) ---------- */
		const result = await query(
			`INSERT INTO jbs.contact_messages
   (session_id, first_name, last_name, email, message)
   VALUES ($1, $2, $3, $4, $5)
   RETURNING id`,
			[sessionId, String(firstName), String(lastName), String(email).toLowerCase().trim(), String(message || "")]
		);

		const messageId = result.rows[0].id;

		/* ---------- Email (SANITIZED output) ---------- */
		const safeMessage = sanitizeEmailMessage(String(message)).replace(/\n/g, "<br />");

		const resend = new Resend(process.env.RESEND_API_KEY);

		await resend.emails.send({
			from: process.env.FROM_EMAIL!,
			to: [process.env.LECTURER_EMAIL!],
			replyTo: String(email).toLowerCase().trim(),
			subject: `New Contact Message (ID: ${messageId})`,
			html: `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; padding: 20px;">
      <h2 style="color: #2563eb;">New Contact Message</h2>

      <p><strong>Message ID:</strong> ${messageId}</p>
      <p><strong>Session ID:</strong> ${sessionId}</p>
      <p><strong>First Name:</strong> ${firstName}</p>
      <p><strong>Last Name:</strong> ${lastName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong><br />${safeMessage || "(empty)"}</p>

      <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ccc;" />

      <p style="font-size: 0.9em; color: #666;">— Contact System</p>
    </div>
  `,
		});

		/* ---------- Response ---------- */
		const res = NextResponse.json({ success: true });

		if (isNew) {
			res.headers.set("Set-Cookie", `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure`);
		}

		return res;
	} catch (error) {
		if (error instanceof ValidationError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}

		console.error("CONTACT API ERROR:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
