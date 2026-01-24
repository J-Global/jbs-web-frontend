"use client";

import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Footer() {
	const t = useTranslations("homepage.footer"); // Namespace for translations

	return (
		<footer className="bg-gray-50 border-t border-gray-200">
			<div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-10 text-gray-700">
				{/* Company Info */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 mb-3">{t("company")}</h3>
					<p className="text-sm leading-relaxed">
						<strong>{t("companyName")}</strong> <br />
					</p>
				</div>

				{/* Office */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 mb-3">{t("office")}</h3>
					<p className="text-sm leading-relaxed">{t("officeAddress")}</p>
				</div>

				{/* Contact */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 mb-3">{t("contact")}</h3>
					<ul className="space-y-2 text-sm">
						<li>
							<span className="font-medium">{t("call")}:</span> 090-2444-6692
						</li>
						<li>
							<span className="font-medium">{t("email")}:</span>{" "}
							<a href="mailto:support@j-global.com" className="text-blue-600 hover:underline">
								support@j-global.com
							</a>
						</li>
					</ul>
				</div>

				{/* Links */}
				<div>
					<h3 className="text-lg font-semibold text-gray-900 mb-3">{t("links")}</h3>
					<ul className="space-y-2 text-sm">
						<li>
							<Link href="/contact-us/" className="hover:text-blue-600 transition">
								{t("contactUs")}
							</Link>
						</li>
						<li>
							<Link href="/privacy-policy/" className="hover:text-blue-600 transition">
								{t("privacyPolicy")}
							</Link>
						</li>
						<li>
							<Link href="/company-profile/" className="hover:text-blue-600 transition">
								{t("companyProfile")}
							</Link>
						</li>
					</ul>
				</div>
			</div>

			{/* Bottom Bar */}
			<div className="border-t border-gray-200">
				<div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
					{/* Logo */}
					<div className="flex items-center gap-2">
						<img src="/logo.avif" alt="JBS Logo" className="h-15 w-auto" />
					</div>

					{/* Social Icons */}
					<div className="flex items-center gap-4 text-gray-500 text-xl">
						<a href="https://www.facebook.com/JGlobalInc" target="_blank" className="hover:text-blue-600 transition">
							<FaFacebookF />
						</a>
						<a href="https://www.instagram.com/jglobal_bizschool/" target="_blank" className="hover:text-pink-600 transition">
							<FaInstagram />
						</a>
					</div>

					{/* Copyright */}
					<p className="text-center md:text-right text-gray-500">
						© {new Date().getFullYear()} j-globalbizschool.com {t("copyright")}.
					</p>
				</div>
			</div>
		</footer>
	);
}
