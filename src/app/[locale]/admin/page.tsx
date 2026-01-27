import LogoutButton from "@/app/components/admin/LogoutButton";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Users, Calendar, Clock, TrendingUp, Mail, Phone, Video, ExternalLink, Ban, RefreshCw } from "lucide-react";
import MessageModal from "@/app/components/admin/ModalMessage";
import { BookingDetailsModal } from "@/app/components/admin/BookinDetails";

export type Booking = {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	phone_number: string;
	message: string;
	event_date: string;
	status: string;
	cancellation_token: string;
	google_calendar_event_id: string;
	zoom_meeting_id: string;
	zoom_join_url: string;
	original_booking_id: string | null;
	rescheduled_at: string | null;
	cancelled_at: string | null;
	created_at: string;
};

function Stat({ title, value, icon, color = "blue" }: { title: string; value: number; icon: React.ReactNode; color?: string }) {
	const colors: Record<string, string> = {
		blue: "bg-blue-100 text-blue-600",
		green: "bg-green-100 text-green-600",
		purple: "bg-purple-100 text-purple-600",
		amber: "bg-amber-100 text-amber-600",
		red: "bg-red-100 text-red-600",
	};

	return (
		<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-slate-600">{title}</p>
					<p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
				</div>
				<div className={`p-3 rounded-xl ${colors[color]}`}>{icon}</div>
			</div>
		</div>
	);
}

export default async function AdminBookingsPage() {
	const isAdmin = (await cookies()).get("admin_session")?.value === "true";
	if (!isAdmin) redirect("/admin/login");

	const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/bookings`, { cache: "no-store" });
	if (!res.ok) throw new Error("Failed to load bookings");

	const allBookings: Booking[] = await res.json();
	const now = new Date();

	// Filter visible bookings (ignore old rescheduled ones)
	const visibleBookings = allBookings.filter((b) => b.status !== "rescheduled");

	// Separate bookings
	const upcomingBookings = visibleBookings.filter((b) => b.status === "confirmed" && new Date(b.event_date) > now);
	const completedBookings = visibleBookings.filter((b) => b.status === "confirmed" && new Date(b.event_date) <= now);
	const cancelledBookings = visibleBookings.filter((b) => b.status === "cancelled");

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
			{/* Header */}
			<header className="sticky top-0 z-20 backdrop-blur-lg bg-white/80 border-b border-slate-200 shadow-sm">
				<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
					<div>
						<p className="text-sm text-slate-600 mt-1">Manage your coaching bookings</p>
					</div>
					<LogoutButton />
				</div>
			</header>

			<main className="mx-auto max-w-7xl px-6 py-8 space-y-12">
				{/* Stats */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
					<Stat title="Total Bookings" value={visibleBookings.length} icon={<Users />} />
					<Stat title="Upcoming" value={upcomingBookings.length} icon={<Calendar />} color="green" />
					<Stat
						title="This Week"
						value={
							upcomingBookings.filter((b) => {
								const eventDate = new Date(b.event_date);
								const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
								return eventDate > now && eventDate <= weekFromNow;
							}).length
						}
						icon={<Clock />}
						color="purple"
					/>
					<Stat title="Completed" value={completedBookings.length} icon={<TrendingUp />} color="amber" />
					<Stat title="Cancelled" value={cancelledBookings.length} icon={<Ban />} color="red" />
				</div>

				{/* Upcoming Bookings */}
				<Section title="Upcoming Bookings" bookings={upcomingBookings} bookingMap={new Map(visibleBookings.map((b) => [b.id, b]))} now={now} highlightToday />

				{/* Completed Bookings */}
				<Section title="Completed Bookings" bookings={completedBookings} bookingMap={new Map(visibleBookings.map((b) => [b.id, b]))} now={now} />

				{/* Cancelled Bookings */}
				<Section title="Cancelled Bookings" bookings={cancelledBookings} bookingMap={new Map(visibleBookings.map((b) => [b.id, b]))} now={now} />
			</main>
		</div>
	);
}

/* ────────────────────────────────
   Booking Table Section
──────────────────────────────── */
function Section({ title, bookings, bookingMap, now, highlightToday }: { title: string; bookings: Booking[]; bookingMap: Map<string, Booking>; now: Date; highlightToday?: boolean }) {
	if (!bookings.length) return null;

	return (
		<div>
			<h2 className="text-xl font-semibold text-slate-800 mb-4">{title}</h2>
			<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-slate-50 border-b border-slate-200">
							<tr>
								<th>Client</th>
								<th>Contact</th>
								<th>Session Date</th>
								<th>Zoom</th>
								<th>Message</th>
								<th>Status</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Details</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-200">
							{bookings.map((b) => {
								const isUpcoming = new Date(b.event_date) > now && b.status === "confirmed";
								const isCancelled = b.status === "cancelled";

								const originalBooking = b.original_booking_id ? bookingMap.get(b.original_booking_id) : null;

								// Highlight today
								const todayClass = highlightToday && new Date(b.event_date).toDateString() === now.toDateString() ? "bg-yellow-50" : "";

								return (
									<tr key={b.id} className={`hover:bg-slate-50 transition ${todayClass}`}>
										{/* Client */}
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
													{b.first_name[0]}
													{b.last_name[0]}
												</div>
												<div>
													<p className="font-medium text-slate-900">
														{b.first_name} {b.last_name}
													</p>
													<p className="text-sm text-slate-500">Booked {new Date(b.created_at).toLocaleDateString("ja-JP")}</p>
												</div>
											</div>
										</td>

										{/* Contact */}
										<td className="px-6 py-4 space-y-1">
											<div className="flex items-center gap-2 text-sm text-slate-700">
												<Mail className="w-4 h-4 text-slate-400" /> {b.email}
											</div>
											{b.phone_number && (
												<div className="flex items-center gap-2 text-sm text-slate-600">
													<Phone className="w-4 h-4 text-slate-400" />
													{b.phone_number}
												</div>
											)}
										</td>

										{/* Date */}
										<td className="px-6 py-4">
											<div className="flex items-center gap-2">
												<Calendar className="w-4 h-4 text-slate-400" />
												<span className="text-sm font-medium text-slate-900">{new Date(b.event_date).toLocaleString("ja-JP", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
											</div>
											{originalBooking && <p className="text-xs text-slate-400 mt-1">Originally planned for {new Date(originalBooking.event_date).toLocaleString("ja-JP", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>}
										</td>

										{/* Zoom */}
										<td className="px-6 py-4">
											{b.zoom_join_url && b.status === "confirmed" ? (
												<a href={b.zoom_join_url} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium">
													<Video className="w-4 h-4" /> Join <ExternalLink className="w-3 h-3" />
												</a>
											) : (
												<span className="text-sm text-slate-400">—</span>
											)}
										</td>

										{/* Message */}
										<td className="px-6 py-4">{b.message ? <MessageModal name={`${b.first_name} ${b.last_name}`} message={b.message} /> : <span className="text-sm text-slate-400">No message</span>}</td>

										{/* Status */}
										<td className="px-6 py-4">
											<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isCancelled ? "bg-red-100 text-red-700" : isUpcoming ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
												{isCancelled ? <Ban className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
												{isCancelled ? "Cancelled" : isUpcoming ? "Upcoming" : "Completed"}
											</span>
										</td>
										<td className="px-6 py-4">
											<BookingDetailsModal booking={b} />
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
