/**
 * Free Coaching - Available Slots API Route
 */

import { weeklySlots } from "@/app/utils/slots";
import { redis } from "@/lib/rate-limit";
import { Ratelimit } from "@upstash/ratelimit";
import { google, calendar_v3 } from "googleapis";
import type { NextRequest } from "next/server";

// ============================================================================
// RATE LIMITER
// ============================================================================

const limiter = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(30, "5m"), // balanced for UX + safety
});

// ============================================================================
// TYPES
// ============================================================================

type CalendarEvent = calendar_v3.Schema$Event;

// ============================================================================
// HELPERS
// ============================================================================

const parseTimeJST = (dateStr: string, timeStr: string): Date => {
	const [hourStr, minStr] = timeStr.split(":");
	return new Date(`${dateStr}T${hourStr.padStart(2, "0")}:${minStr.padStart(2, "0")}:00+09:00`);
};

const isSlotAvailable = (slotStart: Date, slotEnd: Date, events: CalendarEvent[]): boolean => {
	return !events.some((ev) => {
		if (!ev.start?.dateTime || !ev.end?.dateTime) return false;

		const evStart = new Date(ev.start.dateTime);
		const evEnd = new Date(ev.end.dateTime);

		return slotStart < evEnd && slotEnd > evStart;
	});
};

const getAvailableSlotsForDate = (dateStr: string, events: CalendarEvent[]): string[] => {
	const dayOfWeek = new Date(`${dateStr}T00:00:00+09:00`).getDay();
	const slots = weeklySlots[dayOfWeek] ?? [];

	const now = new Date();
	const FOUR_HOURS = 4 * 60 * 60 * 1000;

	return slots.filter((slot) => {
		const slotStart = parseTimeJST(dateStr, slot);
		const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

		if (slotStart.getTime() - now.getTime() < FOUR_HOURS) {
			return false;
		}

		return isSlotAvailable(slotStart, slotEnd, events);
	});
};

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(req: NextRequest): Promise<Response> {
	try {
		// --------------------------------------------------------------------
		// RATE LIMITING
		// --------------------------------------------------------------------

		const forwardedFor = req.headers.get("x-forwarded-for");
		const ip = forwardedFor?.split(",")[0].trim() || req.headers.get("x-real-ip") || "anonymous";

		const { success } = await limiter.limit(ip);

		if (!success) {
			return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), { status: 429 });
		}

		// --------------------------------------------------------------------
		// REQUEST VALIDATION
		// --------------------------------------------------------------------

		const body: unknown = await req.json();

		if (typeof body !== "object" || body === null || !("date" in body) || typeof (body as { date: unknown }).date !== "string") {
			return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
		}

		const dateStr = (body as { date: string }).date;

		if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
			return new Response(JSON.stringify({ error: "Invalid date format" }), { status: 400 });
		}

		const testDate = new Date(`${dateStr}T00:00:00+09:00`);
		if (Number.isNaN(testDate.getTime())) {
			return new Response(JSON.stringify({ error: "Invalid date" }), { status: 400 });
		}

		// --------------------------------------------------------------------
		// ENVIRONMENT CHECK
		// --------------------------------------------------------------------

		const { GOOGLE_SERVICE_CLIENT_EMAIL, GOOGLE_SERVICE_PRIVATE_KEY, GOOGLE_CALENDAR_ID } = process.env;

		if (!GOOGLE_SERVICE_CLIENT_EMAIL || !GOOGLE_SERVICE_PRIVATE_KEY || !GOOGLE_CALENDAR_ID) {
			console.error("Missing Google Calendar env vars");
			return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
		}

		// --------------------------------------------------------------------
		// GOOGLE CALENDAR AUTH
		// --------------------------------------------------------------------

		const auth = new google.auth.JWT({
			email: GOOGLE_SERVICE_CLIENT_EMAIL,
			key: GOOGLE_SERVICE_PRIVATE_KEY.replace(/\\n/g, "\n"),
			scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
		});

		const calendar = google.calendar({ version: "v3", auth });

		// --------------------------------------------------------------------
		// FETCH EVENTS
		// --------------------------------------------------------------------

		const startOfDay = new Date(`${dateStr}T00:00:00+09:00`);
		const endOfDay = new Date(`${dateStr}T23:59:59+09:00`);

		const eventsRes = await calendar.events.list({
			calendarId: GOOGLE_CALENDAR_ID,
			timeMin: startOfDay.toISOString(),
			timeMax: endOfDay.toISOString(),
			singleEvents: true,
			orderBy: "startTime",
		});

		const events: CalendarEvent[] = eventsRes.data.items ?? [];

		// --------------------------------------------------------------------
		// SLOT FILTERING
		// --------------------------------------------------------------------

		const availableSlots = getAvailableSlotsForDate(dateStr, events);

		// --------------------------------------------------------------------
		// RESPONSE (NO DATA LEAKS)
		// --------------------------------------------------------------------

		return new Response(
			JSON.stringify({
				date: dateStr,
				availableSlots,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		console.error("[Available Slots API Error]", error);

		return new Response(JSON.stringify({ error: "Server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
