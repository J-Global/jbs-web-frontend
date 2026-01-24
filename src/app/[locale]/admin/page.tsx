import LogoutButton from "@/app/components/admin/LogoutButton";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Users, Calendar, Clock, TrendingUp, Mail, Phone } from "lucide-react";
import MessageModal from "@/app/components/admin/ModalMessage";

type Booking = {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	phone_number: string;
	message: string;
	event_date: string;
	created_at: string;
};

export default async function AdminPage() {
	const isAdmin = (await cookies()).get("admin_session")?.value === "true";
	if (!isAdmin) redirect("/admin/login");

	const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/bookings`, { cache: "no-store" });

	if (!res.ok) throw new Error("Failed to load bookings");

	const bookings: Booking[] = await res.json();

	// Calculate statistics
	const now = new Date();
	const upcoming = bookings.filter((b) => new Date(b.event_date) > now).length;
	const past = bookings.filter((b) => new Date(b.event_date) <= now).length;
	const thisWeek = bookings.filter((b) => {
		const eventDate = new Date(b.event_date);
		const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
		return eventDate > now && eventDate <= weekFromNow;
	}).length;

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
			{/* Header */}
			<header className="sticky top-0 z-20 backdrop-blur-lg bg-white/80 border-b border-slate-200 shadow-sm">
				<div className="mx-auto max-w-7xl px-6 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Admin Dashboard</h1>
							<p className="text-sm text-slate-600 mt-1">Manage your coaching bookings</p>
						</div>
						<LogoutButton />
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-7xl px-6 py-8">
				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-slate-600">Total Bookings</p>
								<p className="text-3xl font-bold text-slate-900 mt-2">{bookings.length}</p>
							</div>
							<div className="p-3 bg-blue-100 rounded-xl">
								<Users className="w-6 h-6 text-blue-600" />
							</div>
						</div>
					</div>

					<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-slate-600">Upcoming</p>
								<p className="text-3xl font-bold text-slate-900 mt-2">{upcoming}</p>
							</div>
							<div className="p-3 bg-green-100 rounded-xl">
								<Calendar className="w-6 h-6 text-green-600" />
							</div>
						</div>
					</div>

					<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-slate-600">This Week</p>
								<p className="text-3xl font-bold text-slate-900 mt-2">{thisWeek}</p>
							</div>
							<div className="p-3 bg-purple-100 rounded-xl">
								<Clock className="w-6 h-6 text-purple-600" />
							</div>
						</div>
					</div>

					<div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-slate-600">Completed</p>
								<p className="text-3xl font-bold text-slate-900 mt-2">{past}</p>
							</div>
							<div className="p-3 bg-amber-100 rounded-xl">
								<TrendingUp className="w-6 h-6 text-amber-600" />
							</div>
						</div>
					</div>
				</div>

				{/* Bookings Table */}
				<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-slate-50 border-b border-slate-200">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Session Date</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Message</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-200">
								{bookings.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-6 py-12 text-center">
											<div className="flex flex-col items-center justify-center text-slate-500">
												<Calendar className="w-12 h-12 mb-3 text-slate-300" />
												<p className="text-lg font-medium">No bookings yet</p>
												<p className="text-sm">Bookings will appear here once clients make reservations</p>
											</div>
										</td>
									</tr>
								) : (
									bookings.map((b) => {
										const isUpcoming = new Date(b.event_date) > now;
										return (
											<tr key={b.id} className="hover:bg-slate-50 transition-colors">
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
												<td className="px-6 py-4">
													<div className="space-y-1">
														<div className="flex items-center gap-2 text-sm text-slate-700">
															<Mail className="w-4 h-4 text-slate-400" />
															<span>{b.email}</span>
														</div>
														{b.phone_number && (
															<div className="flex items-center gap-2 text-sm text-slate-600">
																<Phone className="w-4 h-4 text-slate-400" />
																<span>{b.phone_number}</span>
															</div>
														)}
													</div>
												</td>
												<td className="px-6 py-4">
													<div className="flex items-center gap-2">
														<Calendar className="w-4 h-4 text-slate-400" />
														<span className="text-sm font-medium text-slate-900">
															{new Date(b.event_date).toLocaleString("ja-JP", {
																year: "numeric",
																month: "short",
																day: "numeric",
																hour: "2-digit",
																minute: "2-digit",
															})}
														</span>
													</div>
												</td>
												<td className="px-6 py-4">{b.message ? <MessageModal name={`${b.first_name} ${b.last_name}`} message={b.message} /> : <span className="text-sm text-slate-400">No message</span>}</td>
												<td className="px-6 py-4">
													<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isUpcoming ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
														<span className={`w-1.5 h-1.5 rounded-full ${isUpcoming ? "bg-green-600" : "bg-slate-600"}`} />
														{isUpcoming ? "Upcoming" : "Completed"}
													</span>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</div>
			</main>
		</div>
	);
}
