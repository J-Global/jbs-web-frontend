// lib/metadata.ts
import { getTranslations } from "next-intl/server";
import type { Metadata, ResolvingMetadata } from "next";
import { I18N, type AppLocale } from "@/i18n/config";

type PageProps = {
	params: Promise<{ locale: AppLocale }>;
};

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL!;

function getLocalePrefix(locale: AppLocale) {
	return locale === I18N.defaultLocale ? "" : `/${locale}`;
}

export async function generatePageMetadata(props: PageProps, parent: ResolvingMetadata, namespace: string, pathname = ""): Promise<Metadata> {
	const { locale } = await props.params;

	const t = await getTranslations({ locale, namespace });

	// ✅ THIS is where your snippet is used
	const languages = Object.fromEntries(
		I18N.locales.map((loc) => [
			loc, // ja / en
			`${SITE_URL}${getLocalePrefix(loc)}${pathname}`,
		])
	);

	const canonical = `${SITE_URL}${getLocalePrefix(locale)}${pathname}`;

	return {
		alternates: {
			canonical,
			languages: {
				...languages,
				"x-default": `${SITE_URL}${pathname}`,
			},
		},
		title: t("title"),
		description: t("description"),

		// Open Graph metadata
		openGraph: {
			title: t("title") || t("title"),
			description: t("description") || t("description"),
			type: "website",
			url: t("title"), // optional, can fallback to current page URL
			images: t("image") ? [{ url: t("image") }] : undefined,
			siteName: "J-Global Business School",
		},

		// Twitter card metadata
		twitter: {
			card: "summary_large_image",
			title: t("title") || t("title"),
			description: t("description") || t("description"),
			images: t("image") ? [t("image")] : undefined,
		},

		icons: {
			icon: "/favicon/favicon.ico",
			shortcut: "/favicon/favicon.ico",
			apple: "/favicon/apple-touch-icon.png",
		},
		manifest: "/favicon/site.webmanifest",
		appleWebApp: {
			title: "J-Global Business School",
		},
	};
}
