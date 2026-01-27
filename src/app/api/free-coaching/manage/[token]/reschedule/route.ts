// app/api/coaching/manage/[token]/reschedule/route.ts
import { query } from "@/utils/neon";
import { deleteCalendarEvent, getCalendarAuth } from "@/utils/google-calendar";
import { deleteZoomMeeting, createZoomMeeting } from "@/utils/zoom";
import { Resend } from "resend";
import { NextRequest } from "next/server";
import { isValidationError } from "@/app/utils/validation/ErrorValidator";
import { Validators } from "@/app/utils/validation/validators";
import { loadServerMessages } from "../../../../../../../messages/server";

export async function POST(req: NextRequest, context: { params: Promise<{ token: string }> }) {
	const locale = req.headers.get("x-locale") || "ja";
	const messages = await loadServerMessages(locale);
	function interpolate(template: string, values: Record<string, string>) {
		return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
	}
	try {
		const { token } = await context.params;

		// Validate token
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(token)) {
			return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400 });
		}

		// Parse request body
		const body = await req.json();
		const { date, time } = body;

		// Validation
		Validators.required(date, "Date");
		Validators.required(time, "Time");

		// Fetch original booking
		const result = await query(
			`SELECT 
        id, first_name, last_name, email, phone_number, message, event_date, status,
        google_calendar_event_id, zoom_meeting_id
      FROM jbs.bookings
      WHERE cancellation_token = $1`,
			[token],
		);

		if (result.rowCount === 0) {
			return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
		}

		const oldBooking = result.rows[0];

		// Validate status - can only reschedule confirmed bookings
		if (oldBooking.status !== "confirmed") {
			return new Response(JSON.stringify({ error: `Cannot reschedule a booking with status: ${oldBooking.status}. You can only reschedule once.` }), { status: 400 });
		}

		// Check 24-hour rule for ORIGINAL booking
		const oldEventDate = new Date(oldBooking.event_date);
		const now = new Date();
		const hoursUntilOldEvent = (oldEventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

		if (hoursUntilOldEvent < 24) {
			return new Response(JSON.stringify({ error: "Cannot reschedule within 24 hours of the original event" }), { status: 400 });
		}

		if (oldEventDate < now) {
			return new Response(JSON.stringify({ error: "Cannot reschedule a past event" }), { status: 400 });
		}

		// Validate new date/time
		const newStart = new Date(`${date}T${time}:00+09:00`);
		const newEnd = new Date(newStart.getTime() + 30 * 60 * 1000);

		if (newStart < now) {
			return new Response(JSON.stringify({ error: "Cannot schedule a booking in the past" }), { status: 400 });
		}

		// Check 4-hour advance notice
		const hoursUntilNewEvent = (newStart.getTime() - now.getTime()) / (1000 * 60 * 60);
		if (hoursUntilNewEvent < 4) {
			return new Response(JSON.stringify({ error: "New booking must be at least 4 hours in the future" }), { status: 400 });
		}

		// Check for conflicts
		const calendar = getCalendarAuth();
		const existing = await calendar.events.list({
			calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
			timeMin: newStart.toISOString(),
			timeMax: newEnd.toISOString(),
			singleEvents: true,
			orderBy: "startTime",
		});

		const hasConflict = existing.data.items?.some((ev) => {
			if (!ev.start?.dateTime || !ev.end?.dateTime) return false;
			const evStart = new Date(ev.start.dateTime);
			const evEnd = new Date(ev.end.dateTime);
			return newStart < evEnd && newEnd > evStart;
		});

		if (hasConflict) {
			return new Response(JSON.stringify({ error: "The selected time slot is already booked. Please choose another time." }), { status: 409 });
		}

		// Delete old calendar event
		if (oldBooking.google_calendar_event_id) {
			try {
				await deleteCalendarEvent(oldBooking.google_calendar_event_id);
			} catch (error) {
				console.error("Failed to delete old calendar event:", error);
			}
		}

		// Delete old Zoom meeting
		if (oldBooking.zoom_meeting_id) {
			try {
				await deleteZoomMeeting(oldBooking.zoom_meeting_id);
			} catch (error) {
				console.error("Failed to delete old Zoom meeting:", error);
			}
		}

		// Create new Zoom meeting
		const startUTC = new Date(newStart.getTime() - newStart.getTimezoneOffset() * 60000);
		const { meeting, registrantLinks } = await createZoomMeeting(`Free Coaching X ${oldBooking.first_name} ${oldBooking.last_name}`, startUTC, 30, [
			{
				email: oldBooking.email,
				firstName: oldBooking.first_name,
				lastName: oldBooking.last_name,
			},
		]);

		const userZoomLink = registrantLinks[oldBooking.email];

		// Create new Google Calendar event
		const newEvent = {
			summary: `Free Coaching X ${oldBooking.first_name} ${oldBooking.last_name}`,
			description: `Free coaching session with ${oldBooking.first_name} ${oldBooking.last_name}
Email: ${oldBooking.email}
${oldBooking.phone_number ? `Phone: ${oldBooking.phone_number}\n` : ""}${oldBooking.message ? `Message: ${oldBooking.message}\n` : ""}
Zoom link: ${userZoomLink || ""}
(Rescheduled from ${oldEventDate.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })})`,
			start: { dateTime: newStart.toISOString(), timeZone: "Asia/Tokyo" },
			end: { dateTime: newEnd.toISOString(), timeZone: "Asia/Tokyo" },
			extendedProperties: {
				private: {
					firstName: oldBooking.first_name,
					lastName: oldBooking.last_name,
					email: oldBooking.email,
					phone: oldBooking.phone_number || "",
					message: oldBooking.message || "",
				},
			},
		};

		const responseEvent = await calendar.events.insert({
			calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
			requestBody: newEvent,
		});

		// Create NEW booking record
		const newBookingResult = await query<{ id: string; cancellation_token: string }>(
			`INSERT INTO jbs.bookings
      (first_name, last_name, email, phone_number, message, event_date,
       google_calendar_event_id, zoom_meeting_id, zoom_join_url, 
       status, original_booking_id, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id, cancellation_token`,
			[oldBooking.first_name, oldBooking.last_name, oldBooking.email, oldBooking.phone_number, oldBooking.message, newStart.toISOString(), responseEvent.data.id, String(meeting.id), userZoomLink, "confirmed", oldBooking.id, new Date().toISOString()],
		);

		const newCancellationToken = newBookingResult.rows[0].cancellation_token;

		// Update OLD booking status
		await query(`UPDATE jbs.bookings SET status = 'rescheduled', rescheduled_at = $1 WHERE id = $2`, [new Date().toISOString(), oldBooking.id]);

		// ============================================================
		// SEND EMAIL NOTIFICATIONS
		// ============================================================
		const resend = new Resend(process.env.RESEND_API_KEY);
		const managementUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://j-globalbizschool.com"}/free-coaching/manage/${newCancellationToken}`;

		// Calendar URLs
		const formatForGoogle = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, "");
		const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Free+Coaching+Session&dates=${formatForGoogle(newStart)}/${formatForGoogle(newEnd)}&details=Your+free+coaching+session&location=Online`;
		const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=Free+Coaching+Session&startdt=${newStart.toISOString()}&enddt=${newEnd.toISOString()}&body=Your+free+coaching+session&location=Online`;

		// Generate ICS file
		const generateICS = ({ title, description, location }: { start: Date; end: Date; title: string; description: string; location: string }) => {
			const formatICSDate = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, "") + "Z";
			return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//J Global Biz School//Coaching Session//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${crypto.randomUUID()}@j-globalbizschool.com`, `DTSTAMP:${formatICSDate(new Date())}`, `DTSTART:${formatICSDate(newStart)}`, `DTEND:${formatICSDate(newEnd)}`, `SUMMARY:${title}`, `DESCRIPTION:${description}`, `LOCATION:${location}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
		};

		const icsContent = generateICS({
			start: newStart,
			end: newEnd,
			title: "Free Coaching Session",
			description: "Your free coaching session",
			location: "Online",
		});

		const text = `
${interpolate(messages.server.email.hi, { name: oldBooking.last_name })}

${messages.server.email.rescheduledIntro}

${messages.server.email.originalDate}: ${oldEventDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "full", timeStyle: "short" })} JST
${messages.server.email.newDate}: ${newStart.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "full", timeStyle: "short" })} JST

Zoomリンク: ${userZoomLink || ""}
予約内容の確認・変更はこちら: ${managementUrl}

${messages.server.email.contact}
メール: ${messages.server.email.supportEmail}

— ${messages.server.email.teamName}

公式ウェブサイト: https://j-globalbizschool.com/
プライバシーポリシー: https://j-globalbizschool.com/privacy-policy/
`;

		// Email to user
		await resend.emails.send({
			from: process.env.FROM_EMAIL || "",
			to: oldBooking.email,
			subject: messages.server.email.rescheduledSubject, // from JSON
			text: text,
			html: `
<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased;">

<!-- Wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:40px 0; background-color:#f8fafc;">
  <tr>
    <td align="center">
      <!-- Container -->
      <table width="540" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 10px 15px -3px rgba(0,0,0,0.04); overflow:hidden;">
        
        <!-- Header -->
        <tr>
          <td style="padding:48px; text-align:center;">
            <h1 style="margin:0; font-size:24px; font-weight:800; color:#0f172a;">${messages.server.email.rescheduledHeader}</h1>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding:0 48px 48px 48px; font-size:15px; line-height:1.6; color:#475569;">
            <p>${interpolate(messages.server.email.hi, { name: locale === "ja" ? oldBooking.last_name : oldBooking.first_name })}</p>
            <p>${messages.server.email.rescheduledIntro}</p>

            <!-- Detail Card -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; border-radius:12px; padding:24px; margin:20px 0; border:1px solid #f1f5f9;">
              <tr>
                <td style="font-weight:600; color:#94a3b8; text-transform:uppercase; font-size:12px; padding-bottom:4px;">${messages.server.email.originalDate}</td>
                <td style="font-weight:600; color:#1e293b; font-size:15px;">${oldEventDate.toLocaleString("en-US", { timeZone: "Asia/Tokyo", dateStyle: "full", timeStyle: "short" })} JST</td>
              </tr>
              <tr>
                <td style="font-weight:600; color:#94a3b8; text-transform:uppercase; font-size:12px; padding-top:8px; padding-bottom:4px;">${messages.server.email.newDate}</td>
                <td style="font-weight:600; color:#1e293b; font-size:15px;">${newStart.toLocaleString("en-US", { timeZone: "Asia/Tokyo", dateStyle: "full", timeStyle: "short" })} JST</td>
              </tr>
            </table>

            <!-- Zoom Button (Centered on Page) -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
              <tr>
                <td align="center">
                  <a href="${userZoomLink}" style="display:inline-block; background-color:#0f172a; color:#ffffff !important; text-decoration:none !important; padding:13px 24px; border-radius:10px; font-weight:600; font-size:15px;">
                    ${messages.server.email.zoomLink}
                  </a>
                </td>
              </tr>
            </table>

            <!-- Reschedule Link -->
            <p style="text-align:center; margin-top:12px; font-size:13px; color:#64748b;">
              <a href="${managementUrl}" style="text-decoration:none; color:#64748b; font-weight:500; border-bottom:1px solid transparent;">${messages.server.email.changeBooking}</a>
            </p>

            <!-- Calendar Links -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
              <tr>
                <td align="center">
                  <a href="${calendarUrl}" style="font-size:12px; color:#0f172a; text-decoration:none; font-weight:700; margin:0 6px;">${messages.server.email.calendar.google}</a>
                  <a href="${outlookUrl}" style="font-size:12px; color:#0f172a; text-decoration:none; font-weight:700; margin:0 6px;">${messages.server.email.calendar.outlook}</a>
                </td>
              </tr>
            </table>

            <!-- Contact -->
            <p style="margin-top:32px; font-size:14px; color:#666;">
              ${messages.server.email.contact} 
              <a href="mailto:${messages.server.email.supportEmail}" style="color:#2563eb; text-decoration:none;">${messages.server.email.supportEmail}</a>
            </p>

            <p style="margin-top:32px;">— ${messages.server.email.teamName}</p>
          </td>
        </tr>
      </table>

      <!-- Footer -->
      <table width="540" cellpadding="0" cellspacing="0" border="0" style="margin:40px auto; text-align:center; font-family:Arial, sans-serif; font-size:12px; color:#94a3b8;">
        <tr>
          <td>
            <img src="https://j-globalbizschool.com/logo.avif" alt="J-Global Business School" style="max-width:120px; margin-bottom:16px; opacity:0.9; display:block; margin-left:auto; margin-right:auto;">
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:10px;">
            <a href="${locale === "ja" ? "https://j-globalbizschool.com/" : "https://j-globalbizschool.com/en/"}" style="color:#94a3b8; text-decoration:none; margin-right:15px;">${messages.server.email.footerWebsite}</a>
            <a href="${locale === "ja" ? "https://j-globalbizschool.com/privacy-policy/" : "https://j-globalbizschool.com/en/privacy-policy/"}" style="color:#94a3b8; text-decoration:none;">${messages.server.email.footerPrivacy}</a>
          </td>
        </tr>
        <tr>
          <td style="font-size:11px; color:#cbd5e1; line-height:1.6;">
            &copy; 2026 J-Global Business School.<br>
            ${messages.server.email.footerCopyright}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</body>
</html>

`,
			attachments: [
				{
					filename: "coaching-session.ics",
					content: icsContent,
					contentType: "text/calendar; charset=utf-8",
				},
			],
		});

		// Email to lecturer
		await resend.emails.send({
			from: process.env.FROM_EMAIL || "",
			to: process.env.LECTURER_EMAIL || "",
			subject: "Coaching Session Rescheduled by User",
			html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; }
  .wrapper { width:100%; padding:40px 0; }
  .container { max-width:540px; margin:0 auto; background-color:#fff; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 10px 15px -3px rgba(0,0,0,0.04); overflow:hidden; padding:32px; }
  h2 { margin-top:0; font-size:22px; color:#0f172a; text-align:center; }
  .card { background:#f8fafc; border-radius:12px; padding:20px; margin:20px 0; border:1px solid #f1f5f9; }
  .label { font-weight:600; color:#94a3b8; text-transform:uppercase; font-size:12px; margin-bottom:4px; }
  .value { font-weight:600; color:#1e293b; font-size:15px; }
  .notes { font-size:14px; color:#475569; line-height:1.6; margin-top:20px; }
  @media screen and (max-width:600px) {
    .container { padding:24px; }
  }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <h2>Coaching Session Rescheduled</h2>

      <p>A user has rescheduled their coaching session.</p>

      <div class="card">
        <p class="label">User Details</p>
        <p class="value"><strong>Name:</strong> ${oldBooking.first_name} ${oldBooking.last_name}</p>
        <p class="value"><strong>Email:</strong> ${oldBooking.email}</p>
        ${oldBooking.phone_number ? `<p class="value"><strong>Phone:</strong> ${oldBooking.phone_number}</p>` : ""}
      </div>

      <div class="card">
        <p class="label">Session Dates</p>
        <p class="value"><strong>Original Date:</strong> ${oldEventDate.toLocaleString("en-US", { timeZone: "Asia/Tokyo", dateStyle: "full", timeStyle: "short" })} JST</p>
        <p class="value"><strong>New Date:</strong> ${newStart.toLocaleString("en-US", { timeZone: "Asia/Tokyo", dateStyle: "full", timeStyle: "short" })} JST</p>
      </div>

      <div class="notes">
        <ul>
          <li>Old calendar event and Zoom meeting have been deleted</li>
          <li>New calendar event has been created</li>
          <li>New Zoom meeting details are in the calendar description</li>
        </ul>
      </div>

      <p class="notes" style="margin-top:30px;">— Booking Notification System</p>
    </div>
  </div>
</body>
</html>


`,
		});

		return new Response(
			JSON.stringify({
				success: true,
				message: "Booking rescheduled successfully",
				newBooking: {
					date: date,
					time: time,
					cancellationToken: newCancellationToken,
				},
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (err) {
		if (isValidationError(err)) {
			return new Response(JSON.stringify({ error: err.message }), {
				status: err.status,
			});
		}

		console.error("[Reschedule Booking Error]", err);
		return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
	}
}
