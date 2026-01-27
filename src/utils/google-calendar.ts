// utils/google-calendar.ts
import { google } from "googleapis";

/**
 * Get authenticated Google Calendar client
 */
export function getCalendarAuth() {
	const auth = new google.auth.JWT({
		email: process.env.GOOGLE_SERVICE_CLIENT_EMAIL,
		key: process.env.GOOGLE_SERVICE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
		scopes: ["https://www.googleapis.com/auth/calendar"],
	});

	return google.calendar({ version: "v3", auth });
}

/**
 * Delete a Google Calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
	const calendar = getCalendarAuth();

	try {
		await calendar.events.delete({
			calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
			eventId: eventId,
		});
		console.log(`✅ Deleted calendar event: ${eventId}`);
	} catch (error) {
		console.error(`❌ Failed to delete calendar event ${eventId}:`, error);
		throw new Error(`Failed to delete calendar event: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Get a Google Calendar event by ID
 */
export async function getCalendarEvent(eventId: string) {
	const calendar = getCalendarAuth();

	try {
		const response = await calendar.events.get({
			calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
			eventId: eventId,
		});
		return response.data;
	} catch (error) {
		console.error(`❌ Failed to get calendar event ${eventId}:`, error);
		throw new Error(`Failed to get calendar event: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}
