// utils/zoom.ts
import fetch from "node-fetch"; // or global fetch in Next.js 13+

// ----------------------------
// Zoom token caching
// ----------------------------
let cachedToken: string | null = null;
let tokenExpiry = 0;

// ----------------------------
// Types
// ----------------------------
interface ZoomTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
}

export interface ZoomMeetingResponse {
	id: number;
	join_url: string;
	start_url: string;
	topic: string;
	start_time: string;
	duration: number;
}

export interface ZoomRegistrant {
	email: string;
	firstName: string;
	lastName: string;
}

interface ZoomRegistrantResponse {
	id: string;
	join_url: string;
	registrant_id: string;
}

// ----------------------------
// Get Zoom OAuth token (Server-to-Server)
// ----------------------------
export async function getZoomToken(): Promise<string> {
	const now = Date.now();

	if (cachedToken && tokenExpiry > now) {
		return cachedToken;
	}

	const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`, {
		method: "POST",
		headers: {
			Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString("base64")}`,
			"Content-Type": "application/json",
		},
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Failed to fetch Zoom token: ${res.status} ${res.statusText} - ${text}`);
	}

	const data = (await res.json()) as ZoomTokenResponse;

	cachedToken = data.access_token;
	tokenExpiry = now + data.expires_in * 1000 - 60_000; // refresh 1 min early

	return cachedToken;
}

// ----------------------------
// Create Zoom meeting + add registrants
// ----------------------------
export async function createZoomMeeting(topic: string, startTime: Date, duration = 30, registrants: ZoomRegistrant[] = []): Promise<{ meeting: ZoomMeetingResponse; registrantLinks: Record<string, string> }> {
	const token = await getZoomToken();

	// 1️⃣ Create meeting
	const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			topic,
			type: 2, // Scheduled meeting
			start_time: startTime.toISOString(),
			duration,
			timezone: "Asia/Tokyo",
			settings: {
				host_video: true,
				participant_video: true,
				join_before_host: false,
				approval_type: 0, // auto-approve
				registration_type: 1, // registration required
				audio: "both",
				waiting_room: true,
				registrants_email_notification: true,
			},
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Failed to create Zoom meeting: ${res.status} ${res.statusText} - ${text}`);
	}

	const meeting = (await res.json()) as ZoomMeetingResponse;

	// 2️⃣ Add registrants and collect their join URLs
	const registrantLinks: Record<string, string> = {};

	for (const r of registrants) {
		const regRes = await fetch(`https://api.zoom.us/v2/meetings/${meeting.id}/registrants`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email: r.email,
				first_name: r.firstName,
				last_name: r.lastName,
			}),
		});

		if (!regRes.ok) {
			const text = await regRes.text();
			console.warn(`Failed to add registrant ${r.email}: ${regRes.status} ${text}`);
			continue;
		}

		const regData = (await regRes.json()) as ZoomRegistrantResponse;
		registrantLinks[r.email] = regData.join_url;
	}

	return { meeting, registrantLinks };
}

/**
 * Delete a Zoom meeting
 */
export async function deleteZoomMeeting(meetingId: string): Promise<void> {
	const token = await getZoomToken();

	try {
		const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Failed to delete Zoom meeting: ${res.status} ${res.statusText} - ${text}`);
		}

		console.log(`✅ Deleted Zoom meeting: ${meetingId}`);
	} catch (error) {
		console.error(`❌ Failed to delete Zoom meeting ${meetingId}:`, error);
		throw new Error(`Failed to delete Zoom meeting: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}
