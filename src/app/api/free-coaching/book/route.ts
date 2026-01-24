import { getOrCreateSession } from "@/utils/db/getOrCreateSession";
import { query } from "@/utils/neon";
import { google } from "googleapis";
import type { NextRequest } from "next/server";
import { Resend } from "resend";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { isValidationError } from "@/app/utils/validation/ErrorValidator";
import { Validators } from "@/app/utils/validation/validators";
import { loadServerMessages } from "../../../../../messages/server";
import { createZoomMeeting } from "@/utils/zoom";

const redis = Redis.fromEnv();
const limiter = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(5, "30m"), // 5 requests per 30 minutes per IP
});

function interpolate(template: string, values: Record<string, string>) {
	return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

export async function POST(req: NextRequest) {
	const ip = req.headers.get("x-forwarded-for") || "unknown";

	// -----------------------------
	// Rate limit check
	// -----------------------------
	const { success } = await limiter.limit(ip);
	if (!success) {
		return new Response(JSON.stringify({ error: "Too many requests. Try later." }), {
			status: 429,
		});
	}

	const locale = req.headers.get("x-locale") || "ja";
	const messages = await loadServerMessages(locale);

	try {
		// -----------------------------
		// Parse request body
		// -----------------------------
		const body = await req.json();
		const { date, time, firstName, lastName, email, phone, message } = body;

		// -----------------------------
		// Validation
		// -----------------------------
		Validators.required(date, "Date");
		Validators.required(time, "Time");
		Validators.required(firstName, "First Name");
		Validators.string(firstName, "First Name");
		Validators.required(lastName, "Last Name");
		Validators.string(lastName, "Last Name");
		Validators.required(email, "Email");
		Validators.email(email);
		if (message) {
			Validators.string(message, "Message");
			Validators.minLength(message, 10, "Message");
			Validators.maxLength(message, 2000, "Message");
		}

		// -----------------------------
		// Google Calendar Auth
		// -----------------------------
		const auth = new google.auth.JWT({
			email: process.env.GOOGLE_SERVICE_CLIENT_EMAIL,
			key: process.env.GOOGLE_SERVICE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
			scopes: ["https://www.googleapis.com/auth/calendar"],
		});
		const calendar = google.calendar({ version: "v3", auth });

		// -----------------------------
		// Event timing
		// -----------------------------
		const start = new Date(`${date}T${time}:00+09:00`);
		const end = new Date(start.getTime() + 30 * 60 * 1000);

		// -----------------------------
		// Check conflicts
		// -----------------------------
		const existing = await calendar.events.list({
			calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
			timeMin: start.toISOString(),
			timeMax: end.toISOString(),
			singleEvents: true,
			orderBy: "startTime",
		});

		const hasConflict = existing.data.items?.some((ev) => {
			if (!ev.start?.dateTime || !ev.end?.dateTime) return false;
			const evStart = new Date(ev.start.dateTime);
			const evEnd = new Date(ev.end.dateTime);
			return start < evEnd && end > evStart;
		});

		if (hasConflict) {
			return new Response(JSON.stringify({ error: "This time slot is already booked." }), { status: 409 });
		}

		const startJST = new Date(`${date}T${time}:00+09:00`);
		const startUTC = new Date(startJST.getTime() - startJST.getTimezoneOffset() * 60000); // adjust to UTC
		const { registrantLinks } = await createZoomMeeting(`Free Coaching X ${firstName} ${lastName}`, startUTC, 30, [{ email, firstName, lastName }]);

		const userZoomLink = registrantLinks[email]; // <-- This is the personal join URL

		// -----------------------------
		// Insert event into calendar
		// -----------------------------
		const event = {
			summary: "Free Coaching X " + firstName + " " + lastName,
			description: `Free coaching session with ${firstName} ${lastName}
Email: ${email}
${phone ? `Phone: ${phone}\n` : ""}${message ? `Message: ${message}\n` : ""}
Zoom link: ${userZoomLink || ""}`,
			start: { dateTime: start.toISOString(), timeZone: "Asia/Tokyo" },
			end: { dateTime: end.toISOString(), timeZone: "Asia/Tokyo" },
			extendedProperties: { private: { firstName, lastName, email, phone: phone || "", message: message || "" } },
		};

		const { sessionId } = await getOrCreateSession(req);

		await query(
			`INSERT INTO jbs.bookings
      (session_id, first_name, last_name, email, phone_number, message, event_date, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
			[sessionId, firstName, lastName, email, phone || "", message || "", start.toISOString(), new Date().toISOString()]
		);

		const responseEvent = await calendar.events.insert({
			calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
			requestBody: event,
		});

		// -----------------------------
		// Send emails
		// -----------------------------
		const resend = new Resend(process.env.RESEND_API_KEY);

		// -----------------------------
		// Calendar helpers
		// -----------------------------
		const formatForGoogle = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, "");
		const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Free+Coaching+Session&dates=${formatForGoogle(start)}/${formatForGoogle(end)}&details=Your+free+coaching+session&location=Online`;

		// Outlook / Teams URL
		const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=Free+Coaching+Session&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=Your+free+coaching+session&location=Online`;

		// ICS generation
		const generateICS = ({ start, end, title, description, location }: { start: Date; end: Date; title: string; description: string; location: string }) => {
			const formatICSDate = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, "") + "Z";

			return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//J Global Biz School//Coaching Session//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${crypto.randomUUID()}@j-globalbizschool.com`, `DTSTAMP:${formatICSDate(new Date())}`, `DTSTART:${formatICSDate(start)}`, `DTEND:${formatICSDate(end)}`, `SUMMARY:${title}`, `DESCRIPTION:${description}`, `LOCATION:${location}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
		};
		const icsContent = generateICS({
			start,
			end,
			title: "Free Coaching Session",
			description: "Your free coaching session",
			location: "Online",
		});

		// Email to user

		await resend.emails.send({
			from: process.env.FROM_EMAIL || "",
			to: email,
			subject: messages.server.email.subject,
			html: `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px;">

  <!-- Logo -->
  <div style="text-align: center; margin-bottom: 20px;">
    <img src="https://j-globalbizschool.com/logo.avif" alt="Company Logo" style="max-width: 150px;" />
  </div>

  <!-- Header -->
  <h2 style="text-align: center; color: #2563eb; margin-bottom: 30px;">
    ${messages.server.email.header}
  </h2>

  <!-- Greeting -->
  <p>${interpolate(messages.server.email.hi, { name: locale == "ja" ? lastName : firstName })}</p>

  <!-- Intro -->
  <p>
    ${messages.server.email.thanks}<br/>
    ${interpolate(messages.server.email.seeYou, { date, time })}
  </p>

  <!-- Booking details -->
  <p>
    <strong>${messages.server.email.serviceBooked}:</strong> ${messages.server.email.serviceName}<br/>
    <strong>${messages.server.email.zoomLink}:</strong>
    <a href="${userZoomLink || ""}" style="color:#2563eb;">${userZoomLink || ""}</a><br/>
    <strong>${messages.server.email.staff}:</strong> ${messages.server.email.staffName}
  </p>

  <!-- Contact -->
  <p>
    ${messages.server.email.contact}<br/>
    <a href="mailto:${messages.server.email.supportEmail}" style="color:#2563eb;">
      ${messages.server.email.supportEmail}
    </a>
  </p>

  <!-- Calendar links (simpler inline style) -->
  <p style="text-align: center; margin-top: 30px; font-size: 14px;">
  <strong>${messages.server.email.calendar.addToCalendar}</strong><br/><br/>

  <a
    href="${calendarUrl}"
    target="_blank"
    rel="noopener noreferrer"
    style="color:#2563eb; text-decoration:underline; margin:0 8px;"
  >
    ${messages.server.email.calendar.google}
  </a>
  |

  <a
    href="${outlookUrl}"
    target="_blank"
    rel="noopener noreferrer"
    style="color:#2563eb; text-decoration:underline; margin:0 8px;"
  >
    ${messages.server.email.calendar.outlook}
  </a>
  |

  <span style="color:#2563eb; margin:0 8px;">
    ${messages.server.email.calendar.apple}
  </span>

  <br/><br/>

  <span style="color:#666; font-size:12px;">
    ${messages.server.email.calendar.appleHint}
  </span>
</p>


  <p style="margin-top: 40px;">— ${messages.server.email.teamName}</p>
</div>
`,
			attachments: [
				{
					filename: "coaching-session.ics",
					content: icsContent, // ← DO NOT base64 encode
					contentType: "text/calendar; charset=utf-8",
				},
			],
		});

		// Email to lecturer
		await resend.emails.send({
			from: process.env.FROM_EMAIL || "",
			to: process.env.LECTURER_EMAIL || "",
			subject: "New Free Coaching Booking Received",
			html: `
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
      <h2>New Coaching Session Booking</h2>

      <p>A new user has booked a free coaching session.</p>

      <p>
        <strong>Name:</strong> ${firstName} ${lastName || ""}<br/>
        <strong>Email:</strong> ${email}<br/>
		${phone?.trim() ? `<strong>Phone Number:</strong> ${phone}<br/>` : ""}
		${message?.trim() ? `<strong>Message:</strong> ${message}<br/>` : ""}
        <strong>Date:</strong> ${date}<br/>
        <strong>Time:</strong> ${time} (JST)<br/><br/>
		You can find the event details and the Zoom link in the calendar event description.

      </p>

      <p>
        — Booking Notification System
      </p>
    </div>
  `,
		});

		// -----------------------------
		// Return success
		// -----------------------------
		return new Response(JSON.stringify({ success: true, event: responseEvent, sessionId }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Set-Cookie": `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
			},
		});
	} catch (err) {
		if (isValidationError(err)) {
			return new Response(JSON.stringify({ error: err.message }), {
				status: err.status,
			});
		}

		console.error(err);

		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
}
