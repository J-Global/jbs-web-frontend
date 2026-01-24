import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
	// Typically corresponds to the `[locale]` segment
	const requested = await requestLocale;
	const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

	// Load all categories needed for the project
	const seo = (await import(`../../messages/${locale}/seo.json`)).default;
	const homepage = (await import(`../../messages/${locale}/homepage.json`)).default;
	const authentication = (await import(`../../messages/${locale}/authentication.json`)).default;
	const levels = (await import(`../../messages/${locale}/levels.json`)).default;
	const freeTrialForm = (await import(`../../messages/${locale}/freeTrialForm.json`)).default;
	const programs = (await import(`../../messages/${locale}/programs.json`)).default;
	const coaching = (await import(`../../messages/${locale}/coaching.json`)).default;
	const privacy = (await import(`../../messages/${locale}/privacyPolicy.json`)).default;
	const company = (await import(`../../messages/${locale}/company.json`)).default;
	const contact = (await import(`../../messages/${locale}/contact.json`)).default;

	// Merge into one messages object
	const messages = { authentication, homepage, seo, levels, freeTrialForm, programs, coaching, privacy, company, contact };

	return { locale, messages };
});
