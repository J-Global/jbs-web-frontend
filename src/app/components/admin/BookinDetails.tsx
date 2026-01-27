"use client";

import { useState } from "react";
import { X, Copy } from "lucide-react";
import { toast } from "sonner";
import { Booking } from "@/app/[locale]/admin/page";

type Props = {
	booking: Booking;
};

export function BookingDetailsModal({ booking }: Props) {
	const [open, setOpen] = useState(false);

	const copy = (value: string) => {
		navigator.clipboard.writeText(value);
		toast.success("Copied to clipboard");
	};

	return (
		<>
			<button onClick={() => setOpen(true)} className="text-sm text-blue-600 hover:underline">
				View
			</button>

			{open && (
				<div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full">
						{/* Header */}
						<div className="flex items-center justify-between px-6 py-4 border-b">
							<h3 className="text-lg font-semibold">Booking details</h3>
							<button onClick={() => setOpen(false)}>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Content */}
						<div className="p-6 space-y-4 text-sm">
							<Detail label="Booking ID" value={booking.id} copy={copy} />
							<Detail label="Cancellation token" value={booking.cancellation_token} copy={copy} />
							<Detail label="Zoom meeting ID" value={booking.zoom_meeting_id} copy={copy} />
							<Detail label="Zoom join URL" value={booking.zoom_join_url} copy={copy} />
							<Detail label="Google Calendar event ID" value={booking.google_calendar_event_id} copy={copy} />

							{booking.original_booking_id && <Detail label="Original booking ID" value={booking.original_booking_id} copy={copy} />}

							<Detail label="Created at" value={new Date(booking.created_at).toLocaleString("ja-JP")} />
							{booking.rescheduled_at && <Detail label="Rescheduled at" value={new Date(booking.rescheduled_at).toLocaleString("ja-JP")} />}
							{booking.cancelled_at && <Detail label="Cancelled at" value={new Date(booking.cancelled_at).toLocaleString("ja-JP")} />}
						</div>

						{/* Footer */}
						<div className="px-6 py-4 border-t text-right">
							<button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm">
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

function Detail({ label, value, copy }: { label: string; value: string; copy?: (v: string) => void }) {
	return (
		<div>
			<p className="text-slate-500 mb-1">{label}</p>
			<div className="flex items-center gap-2">
				<code className="bg-slate-100 px-2 py-1 rounded text-xs break-all">{value}</code>
				{copy && (
					<button onClick={() => copy(value)}>
						<Copy className="w-4 h-4 text-slate-400 hover:text-slate-600" />
					</button>
				)}
			</div>
		</div>
	);
}
