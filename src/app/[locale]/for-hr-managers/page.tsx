import Footer from "@/app/components/Footer";
import FreeTrialSection from "@/app/components/for-hr-managers/free-trial";
import Hero from "@/app/components/for-hr-managers/hero";
import EnterprisePointsSection from "@/app/components/for-hr-managers/points";
import ProblemsSection from "@/app/components/for-hr-managers/problem";
import { AppLocale } from "@/i18n/config";
import { ResolvingMetadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export async function generateMetadata(props: { params: Promise<{ locale: AppLocale }> }, parent: ResolvingMetadata) {
	return generatePageMetadata(props, parent, "seo");
}
export default function HomePage() {
	return (
		<>
			<Hero />
			<ProblemsSection />
			<EnterprisePointsSection />
			<FreeTrialSection />
			<Footer />
		</>
	);
}
