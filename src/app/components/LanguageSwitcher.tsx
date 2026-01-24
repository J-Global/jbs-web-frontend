"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter, Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import { Menu, X } from "lucide-react";
import ApplicationForm from "./ApplicationForm";
import Modal from "./Modal";
import { getLink } from "@/utils/helpers";

export default function LanguageSwitcher() {
	const router = useRouter();
	const pathname = usePathname();
	const currentLocale = useLocale();
	const [isOpen, setIsOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const t = useTranslations("authentication");
	const [isModalOpen, setIsModalOpen] = useState(false);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleLanguageChange = (locale: string) => {
		router.replace(pathname, { locale });
		setIsOpen(false);
	};

	const getLanguageName = (localeCode: string) => {
		switch (localeCode) {
			case "en":
				return "English";
			case "ja":
				return "日本語";
			default:
				return localeCode;
		}
	};

	return (
		<div className="relative z-50">
			{/* Desktop View */}
			<div className="hidden lg:flex items-center gap-5">
				{/* Language Selector */}
				<div className="relative" ref={dropdownRef}>
					<button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-4 py-2 rounded-full border- border-gray-500 backdrop-blur-md hover:border-[#285677]/30 transition-all duration-200">
						<Image src={`/flags/${currentLocale}.png`} alt={currentLocale} width={20} height={14} className="rounded-sm object-cover" />
						<span className="text-gray-700">{getLanguageName(currentLocale)}</span>
						<svg className={`w-4 h-4 text-gray-700 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
						</svg>
					</button>

					{isOpen && (
						<div className="absolute right-0 z-50 mt-2 w-48 rounded-lg bg-white shadow-lg border border-gray-100 overflow-hidden animate-fade-in">
							<ul className="py-1">
								{routing.locales.map((locale) => (
									<li key={locale}>
										<button onClick={() => handleLanguageChange(locale)} className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${currentLocale === locale ? "bg-[#285677]/10 font-medium text-[#285677]" : "hover:bg-gray-50 text-gray-700"}`}>
											<Image src={`/flags/${locale}.png`} alt={locale} width={20} height={14} className="rounded-sm object-cover mr-3" />
											{getLanguageName(locale)}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				{/* Auth Buttons */}
				<div className="flex gap-3">
					<Link target="_blank" href={getLink("fmp", currentLocale)} className="px-5 py-2.5 rounded-full border border-[#d74100] bg-white text-[#d74100] text-sm font-bold hover:bg-[#285677]/10 transition">
						{t("login")}
					</Link>

					{/* Modal */}
					<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("joinPrograms")}>
						<ApplicationForm onClose={() => setIsModalOpen(false)} />
					</Modal>
				</div>
			</div>

			{/* Mobile View */}
			<div className="lg:hidden flex items-center">
				<button onClick={() => setMenuOpen(true)} className="text-gray-800 p-2 rounded-md hover:bg-gray-100 transition">
					<Menu className="w-6 h-6" />
				</button>

				{/* Full-Screen Mobile Menu */}
				{menuOpen && (
					<div className="fixed inset-0 z-[99] bg-white/95 backdrop-blur-sm flex flex-col justify-between p-6 animate-fade-in">
						{/* Close Button */}
						<div className="flex justify-end">
							<button onClick={() => setMenuOpen(false)} className="p-2 rounded-md hover:bg-gray-100 transition">
								<X className="w-6 h-6 text-gray-700" />
							</button>
						</div>

						{/* Menu Content */}
						<div className="flex flex-col justify-center flex-1 gap-8 text-center">
							{/* Language */}
							<div>
								<div className="flex justify-center gap-3 flex-wrap">
									{routing.locales.map((locale) => (
										<button
											key={locale}
											onClick={() => {
												handleLanguageChange(locale);
												setMenuOpen(false);
											}}
											className={`flex items-center px-4 py-2 rounded-lg text-sm ${currentLocale === locale ? "bg-[#285677]/10 text-[#285677] font-medium" : "hover:bg-gray-100 text-gray-700"}`}
										>
											<Image src={`/flags/${locale}.png`} alt={locale} width={20} height={14} className="rounded-sm object-cover mr-2" />
											{getLanguageName(locale)}
										</button>
									))}
								</div>
							</div>

							{/* Auth */}
							<div className="flex flex-col items-center gap-4">
								<Link href="https://fms.j-globalbizschool.com/fmi/webd/IBSApplication?script=login" onClick={() => setMenuOpen(false)} className="w-3/4 text-center px-4 py-2 border border-[#f7a520] rounded-full text-[#f7a520] text-sm hover:bg-[#285677]/10">
									{t("login")}
								</Link>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
