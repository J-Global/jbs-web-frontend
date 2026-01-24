import { MetadataRoute } from "next";

const BASE_URL = "https://www.j-globalbizschool.com";

const staticPages = ["", "privacy-policy", "company-profile", "free-coaching", "for-hr-managers", "contact-us"];

const programPages = ["programs/global-communication/C01", "programs/global-communication/C02", "programs/global-communication/C03", "programs/global-communication/C04", "programs/global-communication/E-AU01", "programs/global-teamwork/L12", "programs/global-teamwork/C06", "programs/global-teamwork/F01", "programs/global-teamwork/F08", "programs/global-teamwork/C09", "programs/global-leadership/L01", "programs/global-leadership/L08", "programs/global-leadership/I01", "programs/global-leadership/L02-2", "programs/global-leadership/L03-2"];

export default function sitemap(): MetadataRoute.Sitemap {
	const now = new Date();
	const urls: MetadataRoute.Sitemap = [];

	const allPages = [...staticPages, ...programPages];

	// 🇯🇵 Japanese (default)
	for (const page of allPages) {
		const path = page ? `/${page}/` : "/";
		urls.push({
			url: `${BASE_URL}${path}`,
			lastModified: now,
			changeFrequency: page === "" ? "weekly" : "monthly",
			priority: page === "" ? 1 : page.startsWith("programs") ? 0.6 : 0.3,
		});
	}

	// 🇺🇸 English
	for (const page of allPages) {
		const path = page ? `/en/${page}/` : "/en/";
		urls.push({
			url: `${BASE_URL}${path}`,
			lastModified: now,
			changeFrequency: page === "" ? "weekly" : "monthly",
			priority: page === "" ? 0.8 : page.startsWith("programs") ? 0.6 : 0.3,
		});
	}

	return urls;
}
