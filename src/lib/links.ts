// --- types.ts ---
export interface LinkEntry {
	url: string;
	langUrls?: Partial<Record<string, string>>;
}

// --- links.ts ---
export const LINKS: Record<string, LinkEntry> = {
	login: {
		url: "https://fms.j-globalbizschool.com/fmi/webd/IBSApplication?script=login",
		langUrls: {
			en: "https://fms.j-globalbizschool.com/fmi/webd/IBSApplication?script=login&param=en",
		},
	},

	fmp: {
		url: "https://fms.j-globalbizschool.com/fmi/webd/IBSApplication",
		langUrls: {
			en: "https://fms.j-globalbizschool.com/fmi/webd/IBSApplication?script=homepageEn",
		},
	},

	freeTrial: {
		url: "https://fms.j-globalbizschool.com/fmi/webd/IBSApplication?script=twoweekstrial",
		langUrls: {
			en: "https://fms.j-globalbizschool.com/fmi/webd/IBSApplication?script=twoweekstrialEn",
		},
	},
	freeCoaching: {
		url: "https://www.j-globalbizschool.com/en/service-page/freecoaching-booking-en",
		langUrls: {
			en: "https://www.j-globalbizschool.com/en/service-page/freecoaching-booking-en",
		},
	},
	joinPrograms: {
		url: "https://fms.j-globalbizschool.com/fmi/webd/IBSApplication",
		langUrls: {
			en: "https://fms.j-globalbizschool.com/fmi/webd/IBSApplication?script=homepageEn",
		},
	},
	registerToProgram: {
		url: "https://fms.j-globalbizschool.com/fmi/webd/IBSApplication?script=JbsProgramsJpn&param=",
		langUrls: {
			en: "https://fms.j-globalbizschool.com/fmi/webd/IBSApplication?script=JbsProgramsEn&param=",
		},
	},
};
