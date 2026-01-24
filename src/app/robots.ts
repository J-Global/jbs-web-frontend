import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "GPTBot",
				allow: "/",
				disallow: ["/api/", "/admin"], // block API and admin
			},
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/api/", "/admin"], // block API and admin for all bots
			},
		],
		sitemap: "https://www.j-globalbizschool.com/sitemap.xml",
	};
}
