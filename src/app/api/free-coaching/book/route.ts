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
	limiter: Ratelimit.slidingWindow(5, "30m"),
});

function interpolate(template: string, values: Record<string, string>) {
	return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

export async function POST(req: NextRequest) {
	const ip = req.headers.get("x-forwarded-for") || "unknown";

	const { success } = await limiter.limit(ip);
	if (!success) {
		return new Response(JSON.stringify({ error: "Too many requests. Try later." }), {
			status: 429,
		});
	}

	const locale = req.headers.get("x-locale") || "ja";
	const messages = await loadServerMessages(locale);

	try {
		const body = await req.json();
		const { date, time, firstName, lastName, email, phone, message } = body;

		// Validation
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

		// Google Calendar Auth
		const auth = new google.auth.JWT({
			email: process.env.GOOGLE_SERVICE_CLIENT_EMAIL,
			key: process.env.GOOGLE_SERVICE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
			scopes: ["https://www.googleapis.com/auth/calendar"],
		});
		const calendar = google.calendar({ version: "v3", auth });

		// Event timing
		const start = new Date(`${date}T${time}:00+09:00`);
		const end = new Date(start.getTime() + 30 * 60 * 1000);

		// Check conflicts
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

		// Create Zoom meeting
		const startJST = new Date(`${date}T${time}:00+09:00`);
		const startUTC = new Date(startJST.getTime() - startJST.getTimezoneOffset() * 60000);
		const { meeting, registrantLinks } = await createZoomMeeting(`Free Coaching X ${firstName} ${lastName}`, startUTC, 30, [{ email, firstName, lastName }]);

		const userZoomLink = registrantLinks[email];

		// Insert event into calendar
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

		const responseEvent = await calendar.events.insert({
			calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
			requestBody: event,
		});

		const { sessionId } = await getOrCreateSession(req);

		// Insert booking with new columns
		const bookingResult = await query<{ id: string; cancellation_token: string }>(
			`INSERT INTO jbs.bookings
  (session_id, first_name, last_name, email, phone_number, message, event_date, 
   google_calendar_event_id, zoom_meeting_id, zoom_join_url, status, created_at)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
  RETURNING id, cancellation_token`,
			[
				sessionId,
				firstName,
				lastName,
				email,
				phone || "",
				message || "",
				start.toISOString(),
				responseEvent.data.id, // $8 - google_calendar_event_id
				String(meeting.id), // $9 - zoom_meeting_id
				userZoomLink, // $10 - zoom_join_url
				"confirmed", // $11 - status
				new Date().toISOString(), // $12 - created_at
			],
		);

		const cancellationToken = bookingResult.rows[0].cancellation_token;

		// Send emails
		const resend = new Resend(process.env.RESEND_API_KEY);

		const formatForGoogle = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, "");
		const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Free+Coaching+Session&dates=${formatForGoogle(start)}/${formatForGoogle(end)}&details=Your+free+coaching+session&location=Online`;
		const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=Free+Coaching+Session&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=Your+free+coaching+session&location=Online`;

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

		// Management URL for reschedule/cancel
		const managementUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://j-globalbizschool.com"}/free-coaching/manage/${cancellationToken}`;

		const text =
			locale === "ja"
				? `${interpolate(messages.server.email.hi, { name: lastName })}

${messages.server.email.thanks}
${interpolate(messages.server.email.seeYou, { date, time })}

${messages.server.email.serviceBooked}: ${messages.server.email.serviceName}
${messages.server.email.staff}: ${messages.server.email.staffName}
${messages.server.email.platform}: ${messages.server.email.platformValue}
${messages.server.email.dateTimeLabel}: ${date} ${time}

Zoom link: ${userZoomLink || ""}
${messages.server.email.rescheduleText}: ${managementUrl}

${messages.server.email.calendar.addToCalendar}
Google Calendar: ${calendarUrl}
Outlook / Teams: ${outlookUrl}

${messages.server.email.contact}
Email: ${messages.server.email.supportEmail}

${messages.server.email.footerWebsite}: ${locale === "ja" ? "https://j-globalbizschool.com/" : "https://j-globalbizschool.com/en/"}
${messages.server.email.footerPrivacy}: ${locale === "ja" ? "https://j-globalbizschool.com/privacy-policy/" : "https://j-globalbizschool.com/en/privacy-policy/"}`
				: `${interpolate(messages.server.email.hi, { name: firstName })}

${messages.server.email.thanks}
${interpolate(messages.server.email.seeYou, { date, time })}

${messages.server.email.serviceBooked}: ${messages.server.email.serviceName}
${messages.server.email.staff}: ${messages.server.email.staffName}
${messages.server.email.platform}: ${messages.server.email.platformValue}
${messages.server.email.dateTimeLabel}: ${date} ${time}

Zoom link: ${userZoomLink || ""}
${messages.server.email.rescheduleText}: ${managementUrl}

${messages.server.email.calendar.addToCalendar}
Google Calendar: ${calendarUrl}
Outlook / Teams: ${outlookUrl}

${messages.server.email.contact}
Email: ${messages.server.email.supportEmail}

${messages.server.email.footerWebsite}: ${locale === "ja" ? "https://j-globalbizschool.com/" : "https://j-globalbizschool.com/en/"}
${messages.server.email.footerPrivacy}: ${locale === "ja" ? "https://j-globalbizschool.com/privacy-policy/" : "https://j-globalbizschool.com/en/privacy-policy/"}`;

		// Email to user
		await resend.emails.send({
			from: process.env.FROM_EMAIL || "",
			to: email,
			subject: messages.server.email.subject,
			text: text,
			html: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${locale}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="540" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 10px 15px -3px rgba(0,0,0,0.04); overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:48px;">
              <span style="display:inline-block; background-color:#f0f7ff; color:#1e40af; font-size:11px; font-weight:700; padding:4px 10px; border-radius:6px; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:20px;">
                ${messages.server.email.badge}
              </span>
              <h1 style="margin:0; font-size:24px; font-weight:800; color:#0f172a; line-height:1.2;">
                ${messages.server.email.header}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:0 48px 48px 48px; font-size:15px; line-height:1.6; color:#475569;">
              ${interpolate(messages.server.email.hi, { name: locale === "ja" ? lastName : firstName })}<br><br>
              ${messages.server.email.thanks}<br>
              ${interpolate(messages.server.email.seeYou, { date, time })}

              <!-- Detail Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; border-radius:12px; padding:24px; margin:20px 0; border:1px solid #f1f5f9;">
                <tr>
                  <td style="font-size:11px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; padding-bottom:4px;">${messages.server.email.serviceBooked}</td>
                  <td style="font-size:15px; font-weight:600; color:#1e293b;">${messages.server.email.serviceName}</td>
                </tr>
                <tr>
                  <td style="font-size:11px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; padding-top:8px; padding-bottom:4px;">${messages.server.email.staff}</td>
                  <td style="font-size:15px; font-weight:600; color:#1e293b;">${messages.server.email.staffName}</td>
                </tr>
                <tr>
                  <td style="font-size:11px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; padding-top:8px; padding-bottom:4px;">${messages.server.email.platform}</td>
                  <td style="font-size:15px; font-weight:600; color:#1e293b;">${messages.server.email.platformValue}</td>
                </tr>
                <tr>
                  <td style="font-size:11px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; padding-top:8px; padding-bottom:4px;">${messages.server.email.dateTimeLabel}</td>
                  <td style="font-size:15px; font-weight:600; color:#1e293b;">${date} ${time}</td>
                </tr>
              </table>

              <!-- Zoom Button -->
             <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0; padding:0;">
  <tr>
    <td align="center" style="padding:20px 0;">
      <a href="${userZoomLink || ""}" 
         style="display:inline-block; background-color:#0f172a; color:#ffffff !important; text-decoration:none !important; padding:13px 24px; border-radius:10px; font-weight:600; font-size:15px;">
         ${messages.server.email.zoomLink}
      </a>
    </td>
  </tr>
</table>


              <a href="${managementUrl}" style="display:block; text-align:center; margin-top:24px; font-size:13px; color:#64748b; text-decoration:none; font-weight:500; border-bottom:1px solid transparent;">
                ${messages.server.email.rescheduleText}
              </a>

              <!-- Instructions -->
              <div style="font-size:13px; line-height:1.6; color:#64748b; margin-top:32px; padding-top:24px; border-top:1px solid #f1f5f9;">
                ${messages.server.email.contact.split("\\n")[0]}<br>
                <a href="mailto:${messages.server.email.supportEmail}" style="color:#1e40af; text-decoration:none; font-weight:600;">
                  ${messages.server.email.supportEmail}
                </a>
              </div>

              <!-- Calendar links -->
              <div style="margin-top:32px; text-align:center;">
                <a href="${calendarUrl}" style="font-size:12px; color:#0f172a; text-decoration:none; font-weight:700; margin:0 6px;">${messages.server.email.calendar.google}</a>
                <a href="${outlookUrl}" style="font-size:12px; color:#0f172a; text-decoration:none; font-weight:700; margin:0 6px;">${messages.server.email.calendar.outlook}</a>
              </div>

            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="540" cellpadding="0" cellspacing="0" border="0" style="margin:40px auto; text-align:center; font-family:Arial, sans-serif; font-size:12px; color:#666;">
          <tr>
            <td>
              <img src="https://j-globalbizschool.com/logo.avif" alt="J-Global Business School" style="max-width:120px; margin-bottom:24px; opacity:0.9; display:block; margin-left:auto; margin-right:auto;">
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:10px;">
              <a href="${locale === "ja" ? "https://j-globalbizschool.com/" : "https://j-globalbizschool.com/en/"}" style="color:#1a73e8; text-decoration:none; margin-right:15px;">${messages.server.email.footerWebsite}</a>
              <a href="${locale === "ja" ? "https://j-globalbizschool.com/privacy-policy/" : "https://j-globalbizschool.com/en/privacy-policy/"}" style="color:#1a73e8; text-decoration:none;">${messages.server.email.footerPrivacy}</a>
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
			subject: "New Free Coaching Booking Received",
			html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; }
  .wrapper { width:100%; table-layout:fixed; padding:40px 0; background-color:#f8fafc; }
  .container { max-width:540px; margin:0 auto; background-color:#fff; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 10px 15px -3px rgba(0,0,0,0.04); overflow:hidden; }
  .header { padding:32px 32px 24px 32px; text-align:center; }
  h2 { margin:0; font-size:20px; font-weight:700; color:#0f172a; }
  .content { padding:0 32px 32px 32px; font-size:15px; color:#475569; line-height:1.6; }
  .detail-card { background-color:#f8fafc; border-radius:12px; padding:20px; border:1px solid #f1f5f9; margin-top:20px; }
  .row { margin-bottom:12px; }
  .label { font-weight:600; color:#94a3b8; margin-right:6px; text-transform:uppercase; font-size:12px; }
  .value { font-weight:500; color:#1e293b; }
  @media screen and (max-width:600px) {
    .wrapper { padding:20px 0; }
    .header, .content { padding:24px; }
  }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h2>New Coaching Session Booking</h2>
      </div>

      <div class="content">
        <p>A new user has booked a free coaching session.</p>

        <div class="detail-card">
          <div class="row"><span class="label">Name:</span><span class="value">${firstName} ${lastName || ""}</span></div>
          <div class="row"><span class="label">Email:</span><span class="value">${email}</span></div>
          ${phone?.trim() ? `<div class="row"><span class="label">Phone Number:</span><span class="value">${phone}</span></div>` : ""}
          ${message?.trim() ? `<div class="row"><span class="label">Message:</span><span class="value">${message}</span></div>` : ""}
          <div class="row"><span class="label">Date:</span><span class="value">${date}</span></div>
          <div class="row"><span class="label">Time:</span><span class="value">${time} (JST)</span></div>
        </div>

        <p style="margin-top:24px;">You can find the event details and the Zoom link in the calendar event description.</p>
        <p>— Booking Notification System</p>
      </div>
    </div>
  </div>
</body>
</html>
`,
		});

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
