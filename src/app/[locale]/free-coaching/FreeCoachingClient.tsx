"use client";

import { useEffect, useState } from "react";
import { format, Locale } from "date-fns";
import { ja, enUS } from "date-fns/locale";

import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import Image from "next/image";
import { FaCheckCircle, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt } from "react-icons/fa";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

// Import useMessages from next-intl (or your custom wrapper)
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import Footer from "@/app/components/Footer";
// NOTE: Make sure the import path above is correct for your project's next-intl setup.

export default function FreeCoachingClient() {
	const locale = useLocale();
	const t = useTranslations("coaching");
	const localeMap: Record<string, Locale> = {
		en: enUS,
		ja: ja,
	};

	const dateFnsLocale = localeMap[locale] || enUS;

	// 2. Access the array using dot notation on the raw object.
	// NOTE: This assumes 'step1' is directly available on the messages object.

	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		phone: "",
		message: "",
	});

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});

	const [step, setStep] = useState(1);

	// Step 2
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
	const [selectedTime, setSelectedTime] = useState<string | null>(null);
	const [times, setTimes] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);

	const next = () => setStep((prev) => prev + 1);
	const prev = () => setStep((prev) => prev - 1);

	useEffect(() => {
		if (!selectedDate) return;

		const dayStr = format(selectedDate, "yyyy-MM-dd");

		setLoading(true);
		fetch("/api/free-coaching/available-slots/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ date: dayStr }),
		})
			.then(async (res) => {
				const text = await res.text();
				let data;
				try {
					data = text ? JSON.parse(text) : { availableSlots: [] };
				} catch (err) {
					console.error("Failed to parse JSON from API:", err, text);
					data = { availableSlots: [] };
				}

				// If API returned an error
				if ("error" in data) {
					toast.error("Error:" + data.error + (data.details ?? ""));
					setTimes([]);
					return;
				}

				setTimes(data.availableSlots || []);
			})
			.catch((err: unknown) => {
				if (err instanceof Error) {
					console.error("Fetch error:", err.message);
				} else {
					console.error("Unknown fetch error:", err);
				}
				setTimes([]);
			})
			.finally(() => setLoading(false));
	}, [selectedDate]);

	// Step 3: Submit and open Google Calendar
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		// Uses translated alert key
		if (!selectedDate || !selectedTime) return alert(t("alerts.select_date_time"));

		const bookingData = {
			firstName: formData.firstName,
			lastName: formData.lastName,
			email: formData.email,
			phone: formData.phone,
			message: formData.message,
			date: format(selectedDate, "yyyy-MM-dd"),
			time: selectedTime,
		};
		try {
			setLoading(true);

			const res = await fetch("/api/free-coaching/book", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-locale": locale,
				},
				body: JSON.stringify(bookingData),
			});

			let data: Record<string, unknown> = {};

			try {
				data = await res.json();
			} catch {
				throw new Error("Invalid server response");
			}

			// API returned an error
			if (!res.ok || data.error) {
				throw new Error(typeof data.error === "string" ? data.error : "Unexpected error");
			}

			// SUCCESS
			next();
		} catch (err: unknown) {
			if (err instanceof Error) {
				toast.error(t("alerts.booking_failed") + ": " + err.message);
			} else {
				toast.error(t("alerts.booking_failed_generic"));
			}
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 pt-16">
			<header className="fixed top-0 left-0 right-0 z-50 mx-auto flex w-full items-center justify-between px-6 py-2 transition-colors duration-300 bg-white shadow-md">
				<div className="max-w-7xl flex w-full items-center justify-between mx-auto">
					<Link href="/" className="flex items-center">
						<Image src="/logo.avif" alt={t("header.alt_logo")} width={120} height={40} className="h-auto w-24 sm:w-32 md:w-32 object-contain" priority />
					</Link>
					<div className="flex items-center space-x-4">
						<LanguageSwitcher />
					</div>
				</div>
			</header>

			<div className="max-w-7xl w-full space-y-10 mt-20">
				<AnimatePresence mode="wait">
					{/* Step 1: Intro */}
					{step === 1 && (
						<motion.div key="step1" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto">
							<div className="grid lg:grid-cols-7 gap-8 lg:gap-12">
								{/* Left: Hero & Info */}
								<div className="lg:col-span-4 space-y-8">
									{/* Hero Image */}
									<div className="relative h-72 sm:h-80 lg:h-96 rounded-2xl overflow-hidden shadow-lg">
										<Image src="/img/free-coaching.avif" alt="Online coaching session" fill className="object-cover" priority />
										<div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
									</div>

									{/* Booking CTA (under image on mobile) */}
									<div className="block lg:hidden">
										<div className="bg-linear-to-br from-white to-gray-50 border border-gray-200 rounded-3xl shadow-xl  p-4 sm:p-8 space-y-8 mt-6">
											<div className="space-y-4 text-center">
												<h1 className="text-3xl font-bold text-gray-900 leading-tight">{t("step1.title")}</h1>
												<p className="text-gray-600 text-lg leading-relaxed">{t("step1.intro_p")}</p>
											</div>

											<div className="space-y-4">
												<button onClick={next} className="w-full bg-linear-to-r from-[#d74100] to-[#ff5a1f] hover:from-[#bf3a00] hover:to-[#e04e00] text-white font-semibold py-4 px-8 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3">
													<FaCalendarAlt className="w-5 h-5" />
													{t("step1.button_text")}
												</button>
											</div>

											<div className="pt-6 border-t border-gray-200 space-y-3 text-sm text-gray-600">
												<div className="flex items-center justify-center gap-3">
													<FaEnvelope className="w-4 h-4 text-gray-400" />
													<span>{t("step1.contact_email")}</span>
												</div>
												<div className="flex items-center justify-center gap-3">
													<FaMapMarkerAlt className="w-4 h-4 text-gray-400" />
													<span>{t("step1.contact_location")}</span>
												</div>
											</div>
										</div>
									</div>

									{/* Info Sections */}
									<div className="space-y-6">
										{/* Coach Intro */}
										<div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8 shadow-sm">
											<div className="space-y-4">
												<h3 className="font-semibold text-gray-900 text-lg">{t("step1.coach_title")}</h3>
												<p className="text-gray-700 leading-relaxed">
													{t("step1.coach_p_1")}
													<strong className="text-blue-600">{t("step1.coach_p_2_bold")}</strong>
													{t("step1.coach_p_3")}
												</p>
											</div>
										</div>

										{/* Session Details */}
									</div>
								</div>

								{/* Right: Booking CTA (desktop only) */}
								<div className="lg:col-span-3 hidden lg:block">
									<div className="sticky top-28 bg-linear-to-br from-white to-gray-50 border border-gray-200 rounded-3xl shadow-xl p-8 space-y-8">
										<div className="space-y-4 text-center">
											<h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">{t("step1.title")}</h1>
											<p className="text-gray-600 text-lg leading-relaxed">{t("step1.intro_p")}</p>
										</div>

										<div className="space-y-4">
											<button onClick={next} className="w-full bg-linear-to-r from-[#d74100] to-[#ff5a1f] hover:from-[#bf3a00] hover:to-[#e04e00] text-white font-semibold py-4 px-8 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3">
												<FaCalendarAlt className="w-5 h-5" />
												{t("step1.button_text")}
											</button>
										</div>

										<div className="pt-6 border-t border-gray-200 space-y-3 text-sm text-gray-600">
											<div className="flex items-center justify-center gap-3">
												<FaEnvelope className="w-4 h-4 text-gray-400" />
												<span>{t("step1.contact_email")}</span>
											</div>
											<div className="flex items-center justify-center gap-3">
												<FaMapMarkerAlt className="w-4 h-4 text-gray-400" />
												<span>{t("step1.contact_location")}</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{/* Step 2: Date & Time */}
					{step === 2 && (
						<motion.div key="step2" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: 0.5, ease: "easeOut" }} className="relative p-6 sm:p-8 md:p-10 bg-linear-to-br from-white/90 to-blue-50/80 backdrop-blur-md rounded-3xl shadow-xl border border-blue-100">
							{/* Header */}
							<div className="text-center mb-6 sm:mb-8">
								<h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
									{t("step2.title_1")} <span className="text-blue-600">{t("step2.title_2_span")}</span>
								</h2>
								<p className="text-gray-500 mt-2 text-sm sm:text-base">{t("step2.sub_p")}</p>
							</div>

							{/* Layout */}
							<div className="flex flex-col lg:flex-row gap-6 sm:gap-10 items-start">
								{/* Calendar */}
								<div className="w-full max-w-full md:max-w-md  bg-white/80 rounded-2xl p-6 shadow-lg border border-gray-100 backdrop-blur-md flex flex-col items-center text-center">
									<DayPicker
										mode="single"
										selected={selectedDate}
										onSelect={(date) => setSelectedDate(date || undefined)}
										disabled={{ before: new Date() }}
										className="rounded-xl text-gray-800"
										modifiersClassNames={{
											selected: "bg-blue-600 text-white rounded-lg shadow-md",
											today: "font-semibold border border-blue-300 rounded-lg",
										}}
										// Accessibility translation
										captionLayout="dropdown"
										aria-label={t("step2.day_picker_aria_label")}
										locale={dateFnsLocale} // <-- dynamically set locale
									/>
								</div>

								{/* Time Slots */}
								<div className="w-full lg:w-2/3 relative bg-white/70 rounded-2xl p-0 sm:p-8 shadow-inner border border-gray-100 backdrop-blur-sm min-h-60 sm:min-h-[280px] flex items-center justify-center">
									{loading && (
										<div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-md rounded-2xl z-10">
											<div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
										</div>
									)}

									{!loading && selectedDate ? (
										<div className="w-full space-y-4 sm:space-y-6">
											{!times || times.length === 0 ? (
												<p className="text-gray-500 text-center text-base sm:text-lg">{t("step2.no_slots")}</p>
											) : (
												<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
													{times.map((time, index) => (
														<motion.button key={index} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedTime(time)} className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl border font-medium transition-all duration-300 text-xs sm:text-sm md:text-base ${selectedTime === time ? "bg-blue-600 text-white shadow-lg" : "bg-white/80 border-gray-300 hover:border-blue-400 hover:bg-blue-50"}`}>
															{time}
														</motion.button>
													))}
												</div>
											)}
										</div>
									) : (
										!loading && <p className="text-gray-500 text-center text-base sm:text-lg">{t("step2.select_date_prompt")}</p>
									)}
								</div>
							</div>

							{/* Footer Buttons */}
							<div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 sm:mt-10">
								<motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={prev} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium shadow-sm transition-all text-sm sm:text-base">
									{t("step2.button_back")}
								</motion.button>

								<motion.button whileHover={selectedDate && selectedTime ? { scale: 1.05 } : {}} whileTap={selectedDate && selectedTime ? { scale: 0.95 } : {}} onClick={next} disabled={!selectedDate || !selectedTime} className={`w-full sm:w-auto px-8 py-3 rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base ${selectedDate && selectedTime ? "bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}>
									{t("step2.button_next")}
								</motion.button>
							</div>
						</motion.div>
					)}

					{/* Step 3: Personal Info Form */}
					{step === 3 && (
						<motion.div key="step3" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: 0.5, ease: "easeOut" }} className="relative p-4 sm:p-10 bg-white/90 rounded-3xl shadow-xl border border-gray-200 max-w-2xl mx-auto">
							<div className="text-center mb-8">
								<h2 className="text-3xl font-bold text-gray-800">
									{t("step3.title_1")} <span className="text-blue-600">{t("step3.title_2_span")}</span>
								</h2>
								<p className="text-gray-500 mt-2 text-sm sm:text-base">{t("step3.sub_p")}</p>
							</div>

							<form onSubmit={handleSubmit} className="space-y-6">
								{/* First & Last Name */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{/* First Name */}
									<div className="relative">
										<label className="absolute -top-2 left-3 bg-white px-1 text-sm font-medium text-gray-700">
											{t("step3.placeholder_first_name")}
											<span className="text-red-500 ml-1">*</span>
										</label>
										<input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
									</div>

									{/* Last Name */}
									<div className="relative">
										<label className="absolute -top-2 left-3 bg-white px-1 text-sm font-medium text-gray-700">
											{t("step3.placeholder_last_name")}
											<span className="text-red-500 ml-1">*</span>
										</label>
										<input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
									</div>
								</div>

								{/* Email */}
								<div className="relative">
									<label className="absolute -top-2 left-3 bg-white px-1 text-sm font-medium text-gray-700">
										{t("step3.placeholder_email")}
										<span className="text-red-500 ml-1">*</span>
									</label>
									<input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 border rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
								</div>

								{/* Phone */}
								<div className="relative">
									{/* Floating Label */}
									<label className="absolute -top-2 left-3 rounded-2xl bg-white px-1 text-sm font-medium text-gray-700 z-10">
										{t("step3.placeholder_phone")} <span className="text-gray-400 font-normal text-xs">{t("step3.optional")}</span>
									</label>

									{/* Phone Input Wrapper Fix */}
									<div className="border border-gray-300 phone-wrapper rounded-2xl hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
										<PhoneInput defaultCountry="jp" className="w-full rounded-2xl p-3" inputClassName="!rounded-xl !p-3 !border-none !focus:outline-none !text-base" />
									</div>
								</div>

								{/* Message (Optional) */}
								<div className="relative">
									<label className="absolute -top-2 left-3 bg-white px-1 text-sm font-medium text-gray-500">
										{t("step3.placeholder_message")}
										<span className="text-gray-400 font-normal text-xs">{t("step3.optional")}</span>
									</label>
									<textarea name="message" rows={4} value={formData.message} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
								</div>

								{/* Buttons */}
								<div className="flex justify-between items-center mt-6">
									<motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={prev} type="button" className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium shadow-sm transition-all">
										{t("step3.button_back")}
									</motion.button>

									<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={loading} className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${loading ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg"}`}>
										{loading ? t("step3.button_submitting") : t("step3.button_submit")}
									</motion.button>
								</div>
							</form>
						</motion.div>
					)}

					{/* Step 4: Confirmation */}
					{step === 4 && (
						<motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5, ease: "easeOut" }} className="relative p-12 bg-white/90 rounded-3xl shadow-xl border border-gray-200 max-w-xl mx-auto text-center space-y-8">
							<div className="flex justify-center">
								<FaCheckCircle className="w-16 h-16 text-green-500" />
							</div>
							<h2 className="text-3xl font-bold text-gray-800">{t("step4.title")}</h2>
							<p className="text-gray-600 text-lg">
								{t("step4.p_thank_you_1")}
								{formData.firstName}
								{t("step4.p_thank_you_2")}
								<strong>
									{format(selectedDate!, "MMMM dd, yyyy")} at {selectedTime}
								</strong>
								.
							</p>
							<p className="text-gray-500 text-sm">{t("step4.p_confirmation_email")}</p>
							<a href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(t("step4.calendar_event_name"))}&dates=${format(selectedDate!, "yyyyMMdd")}T${selectedTime?.replace(":", "")}00Z/${format(selectedDate!, "yyyyMMdd")}T${selectedTime?.replace(":", "")}00Z&details=${encodeURIComponent(t("step4.calendar_event_details"))}&location=${encodeURIComponent(t("step4.calendar_event_location"))}`} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 transition-all duration-200">
								{t("step4.button_google_calendar")}
							</a>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
			<div className="mt-10">
				{" "}
				<Footer />
			</div>
		</div>
	);
}
