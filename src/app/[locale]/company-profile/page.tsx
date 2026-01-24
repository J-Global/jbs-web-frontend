// app/[locale]/company/page.tsx
// Modern, professional, styled Company Overview (next-intl + Tailwind)

import Footer from "@/app/components/Footer";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { AppLocale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { generatePageMetadata } from "@/lib/seo";
import { ResolvingMetadata } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";

export async function generateMetadata(props: { params: Promise<{ locale: AppLocale }> }, parent: ResolvingMetadata) {
	return generatePageMetadata(props, parent, "seo");
}

export default function CompanyOverviewPage() {
	const t = useTranslations("company");

	const rows = ["name", "address", "phone", "email", "website", "established", "business", "representative", "employees"];

	return (
		<div>
			<header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
				<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
					<Link href="/" className="flex items-center">
						<Image src="/logo.avif" alt="J-Global Logo" width={120} height={40} className="w-24 object-contain sm:w-32" priority />
					</Link>
					<LanguageSwitcher />
				</div>
			</header>
			<main className="bg-gradient-to-b from-gray-50 to-white mt-10">
				{/* Header */}
				<section className="relative max-w-6xl mx-auto px-6 pt-28 pb-20">
					<div className="absolute inset-0 -z-10">
						<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-100/40 blur-3xl rounded-full" />
					</div>

					<h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">{t("title")}</h1>
					<p className="mt-5 text-lg text-gray-600 max-w-2xl">{t("subtitle")}</p>
				</section>

				{/* Content Card */}
				<section className="max-w-6xl mx-auto px-6 pb-28">
					<div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
						{rows.map((key, index) => (
							<div key={key} className={`grid grid-cols-1 md:grid-cols-4 gap-6 px-8 md:px-12 py-8 transition-colors ${index !== rows.length - 1 ? "border-b border-gray-100" : ""} hover:bg-gray-50/60`}>
								{/* Label */}
								<div className="text-sm font-semibold text-gray-500 flex items-start">
									<span className="relative">
										{t(`${key}.label`)}
										<span className="absolute left-0 -bottom-1 w-6 h-[2px] bg-[#215ca5] rounded-full opacity-60" />
									</span>
								</div>

								{/* Value */}
								<div className="md:col-span-3 text-base text-gray-900 leading-relaxed">
									{t.rich(`${key}.value`, {
										link: (chunks) => (
											<a href={chunks as string} target="_blank" rel="noopener noreferrer" className="block text-[#215ca5] font-medium underline-offset-4 hover:underline">
												{chunks}
											</a>
										),
										br: () => <></>, // optional, since each link is already block
									})}
								</div>
							</div>
						))}
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
}
