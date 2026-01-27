"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format, type Locale } from "date-fns";
import { ja, enUS } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import Image from "next/image";
import { FaCheckCircle, FaCalendarAlt, FaSpinner, FaVideo, FaClock, FaUser, FaArrowLeft } from "react-icons/fa";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { Link } from "@/i18n/navigation";

/* ───────────────────── Types ───────────────────── */

interface Booking {
	firstName: string;
	lastName: string;
	eventDate: string; // ISO
	zoomJoinUrl?: string | null;
	status: string;
}

interface ManageBookingResponse {
	booking: Booking;
	canReschedule: boolean;
	canCancel: boolean;
}

interface AvailableSlotsResponse {
	availableSlots: string[];
}

/* ───────────────────── Page ───────────────────── */

export default function ManageBookingPage() {
	const params = useParams<{ token: string }>();
	const locale = useLocale();
	const t = useTranslations("coaching.manage");
	const token = params.token;

	const localeMap: Record<string, Locale> = { en: enUS, ja };
	const dateFnsLocale = localeMap[locale] ?? enUS;

	const [loading, setLoading] = useState<boolean>(true);
	const [booking, setBooking] = useState<Booking | null>(null);
	const [canReschedule, setCanReschedule] = useState<boolean>(false);
	const [canCancel, setCanCancel] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const [showReschedule, setShowReschedule] = useState<boolean>(false);
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
	const [selectedTime, setSelectedTime] = useState<string | null>(null);
	const [availableTimes, setAvailableTimes] = useState<string[]>([]);
	const [loadingTimes, setLoadingTimes] = useState<boolean>(false);
	const [submitting, setSubmitting] = useState<boolean>(false);
	const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
	const [success, setSuccess] = useState<"reschedule" | "cancel" | null>(null);

	/* ───────────── Fetch booking ───────────── */

	useEffect(() => {
		const fetchBooking = async () => {
			try {
				const res = await fetch(`/api/free-coaching/manage/${token}`);
				const data: ManageBookingResponse = await res.json();
				console.log(data);

				if (!res.ok) {
					throw new Error(data ? t("requestFailed") : t("requestFailed"));
				}

				setBooking(data.booking);
				setCanReschedule(data.canReschedule);
				setCanCancel(data.canCancel);
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : t("requestFailed"));
			} finally {
				setLoading(false);
			}
		};

		fetchBooking();
	}, [token, t]);

	/* ───────────── Fetch available slots ───────────── */

	useEffect(() => {
		if (!selectedDate) return;

		setLoadingTimes(true);

		fetch("/api/free-coaching/available-slots/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				date: format(selectedDate, "yyyy-MM-dd"),
			}),
		})
			.then((res) => res.json())
			.then((data: AvailableSlotsResponse) => {
				setAvailableTimes(data.availableSlots ?? []);
			})
			.finally(() => setLoadingTimes(false));
	}, [selectedDate]);

	/* ───────────── Actions ───────────── */

	const handleAction = async (type: "reschedule" | "cancel") => {
		setSubmitting(true);

		try {
			const res = await fetch(`/api/free-coaching/manage/${token}/${type}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-locale": locale,
				},
				body:
					type === "reschedule"
						? JSON.stringify({
								date: format(selectedDate as Date, "yyyy-MM-dd"),
								time: selectedTime,
							})
						: null,
			});

			if (!res.ok) throw new Error();

			setSuccess(type);
		} catch {
			toast.error(t("requestFailed"));
			setSubmitting(false);
		}
	};

	/* ───────────── Loading ───────────── */

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<FaSpinner className="animate-spin text-[#d74100] w-8 h-8" />
			</div>
		);
	}

	/* ───────────── Error ───────────── */

	if (error) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
				<h1 className="text-3xl font-bold text-gray-900 mb-4">Oops!</h1>
				<p className="text-gray-500 mb-6">{error}</p>
				<Link href="/" className="px-8 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all">
					Return Home
				</Link>
			</div>
		);
	}

	if (!booking) return null;

	/* ───────────── UI ───────────── */

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col items-center pb-20">
			<header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3">
				<div className="max-w-7xl mx-auto flex justify-between items-center">
					<Link href="/">
						<Image src="/logo.avif" alt="Logo" width={120} height={40} className="w-24 sm:w-28 object-contain" priority />
					</Link>
					<LanguageSwitcher />
				</div>
			</header>

			<div className="max-w-5xl w-full px-4 mt-32">
				<AnimatePresence mode="wait">
					{success ? (
						<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-12 rounded-3xl shadow-sm border border-gray-200 text-center max-w-2xl mx-auto">
							<FaCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
							<h2 className="text-2xl font-bold text-gray-900 mb-2">{success === "reschedule" ? t("successReschedule") : t("successCancel")}</h2>
							<p className="text-gray-500 mb-8">{t("successText")}</p>
							<Link href="/" className="inline-block px-8 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all">
								{t("returnHome")}
							</Link>
						</motion.div>
					) : !showReschedule ? (
						<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
							<div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
								<div className="p-8 sm:p-12">
									<h1 className="text-2xl font-bold text-gray-900 mb-10">{t("pageTitle")}</h1>

									<div className="grid md:grid-cols-2 gap-12">
										<div className="space-y-8">
											<InfoRow icon={<FaUser className="text-[#d74100]" />} label={t("clientName")} value={`${booking.firstName} ${booking.lastName}`} />
											<InfoRow icon={<FaCalendarAlt className="text-[#d74100]" />} label={t("coachingDate")} value={new Date(booking.eventDate).toLocaleString(locale, { dateStyle: "full", timeStyle: "short" })} />
										</div>

										<div className="space-y-8">
											<InfoRow
												icon={<FaVideo className="text-[#d74100]" />}
												label={t("meetingLink")}
												value={
													booking.zoomJoinUrl ? (
														<a href={booking.zoomJoinUrl} target="_blank" className="text-blue-600 font-medium hover:underline">
															{t("launchZoom")}
														</a>
													) : (
														"Not available"
													)
												}
											/>
											<InfoRow icon={<FaClock className="text-[#d74100]" />} label={t("currentStatus")} value={<span className="text-xs font-bold uppercase tracking-widest px-3 py-1 bg-gray-100 text-gray-600 rounded-lg">{booking.status}</span>} />
										</div>
									</div>
								</div>
							</div>

							<div className="flex flex-col sm:flex-row gap-4">
								{canReschedule && (
									<button onClick={() => setShowReschedule(true)} className="flex-2 bg-linear-to-r from-[#d74100] to-[#ff5a1f] text-white py-4 px-8 rounded-2xl font-bold shadow-lg hover:shadow-orange-100 transition-all">
										{t("rescheduleBtn")}
									</button>
								)}
								{canCancel && (
									<button onClick={() => setShowCancelConfirm(true)} className="flex-1 bg-white border border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 py-4 px-8 rounded-2xl font-bold transition-all">
										{t("cancelBtn")}
									</button>
								)}
							</div>
						</motion.div>
					) : (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-gray-200">
							<button onClick={() => setShowReschedule(false)} className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
								<FaArrowLeft /> {t("backBtn")}
							</button>

							<div className="grid lg:grid-cols-[350px_1fr] gap-12">
								<div className="space-y-6">
									<h2 className="text-xl font-bold text-gray-900">{t("selectDate")}</h2>
									<div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-center">
										<DayPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={{ before: new Date() }} locale={dateFnsLocale} />
									</div>
								</div>

								<div className="space-y-6">
									<h2 className="text-xl font-bold text-gray-900">{t("availableTimes")}</h2>

									{loadingTimes ? (
										<div className="py-10 flex justify-center">
											<FaSpinner className="animate-spin text-[#d74100]" />
										</div>
									) : availableTimes.length > 0 ? (
										<div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
											{availableTimes.map((time) => (
												<button key={time} onClick={() => setSelectedTime(time)} className={`py-3 px-2 text-sm rounded-xl border-2 font-bold transition-all ${selectedTime === time ? "border-[#d74100] bg-orange-50 text-[#d74100]" : "border-gray-100 hover:border-gray-300 text-gray-600"}`}>
													{time}
												</button>
											))}
										</div>
									) : (
										<div className="h-full min-h-[200px] flex items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 italic">{t("selectTimeHint")}</div>
									)}
								</div>
							</div>

							<div className="mt-12 pt-8 border-t border-gray-100 flex justify-end">
								<button onClick={() => handleAction("reschedule")} disabled={!selectedTime || submitting} className="w-full sm:w-auto px-12 py-4 bg-linear-to-r from-[#d74100] to-[#ff5a1f] disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white rounded-2xl font-bold shadow-xl transition-all">
									{submitting ? t("updating") : t("confirmReschedule")}
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{showCancelConfirm && (
				<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
					<motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl">
						<h3 className="text-xl font-bold text-gray-900 mb-2">{t("cancelModalTitle")}</h3>
						<p className="text-gray-500 mb-8 text-sm leading-relaxed">{t("cancelModalText")}</p>

						<div className="grid grid-cols-2 gap-3">
							<button onClick={() => setShowCancelConfirm(false)} disabled={submitting} className={`py-3 text-sm font-bold transition ${submitting ? "text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>
								{t("keepIt")}
							</button>

							<button
								onClick={async () => {
									setSubmitting(true);
									try {
										await handleAction("cancel");
										setShowCancelConfirm(false);
									} finally {
										setSubmitting(false);
									}
								}}
								disabled={submitting}
								className="py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition flex justify-center items-center"
							>
								{submitting ? <FaSpinner className="animate-spin w-5 h-5" /> : t("yesCancel")}
							</button>
						</div>
					</motion.div>
				</div>
			)}
		</div>
	);
}

/* ───────────────────── InfoRow ───────────────────── */

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
	return (
		<div className="flex items-start gap-4">
			<div className="mt-1 text-lg">{icon}</div>
			<div>
				<p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-1">{label}</p>
				<div className="text-gray-900 font-semibold">{value}</div>
			</div>
		</div>
	);
}
