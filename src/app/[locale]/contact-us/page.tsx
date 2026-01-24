import React from "react";
import { Phone, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import Footer from "@/app/components/Footer";
import ContactForm from "@/app/components/contact-us/contactForm";
import { AppLocale } from "@/i18n/config";
import { ResolvingMetadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export async function generateMetadata(props: { params: Promise<{ locale: AppLocale }> }, parent: ResolvingMetadata) {
	return generatePageMetadata(props, parent, "seo");
}
export default function ContactPage() {
	const t = useTranslations("contact");

	return (
		<div>
			<header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
				<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
					<Link href="/" className="flex items-center">
						<Image src="/logo.avif" alt="J-Global Logo" width={120} height={40} priority />
					</Link>
					<LanguageSwitcher />
				</div>
			</header>

			<section className="relative mt-16 bg-gradient-to-b from-white to-slate-50 border-t py-20">
				<div className="max-w-3xl mx-auto px-4">
					<div className="mb-16 text-center">
						<h1 className="text-4xl font-semibold mb-6">{t("title")}</h1>
						<p className="text-lg text-slate-600">{t("intro")}</p>
					</div>

					{/* Contact info */}
					<div className="grid sm:grid-cols-2 gap-6 mb-12">
						<div className="rounded-3xl bg-white border border-gray-300 p-6 flex items-center gap-4">
							<div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center">
								<Phone className="w-5 h-5" />
							</div>
							<div>
								<p className="text-sm text-slate-500">{t("phone.label")}</p>
								<p className="text-lg font-medium">{t("phone.value")}</p>
							</div>
						</div>

						<div className="rounded-3xl bg-white border border-gray-300 p-6 flex items-center gap-4">
							<div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center">
								<Mail className="w-5 h-5" />
							</div>
							<div>
								<p className="text-sm text-slate-500">{t("email.label")}</p>
								<p className="text-lg font-medium">{t("email.value")}</p>
							</div>
						</div>
					</div>

					{/* Client form */}
					<ContactForm />
				</div>
			</section>

			<Footer />
		</div>
	);
}
