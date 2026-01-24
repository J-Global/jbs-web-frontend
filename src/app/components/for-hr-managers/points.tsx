import Image from "next/image";

const points = [
	{
		title: "グローバル知識の現状把握",
		description: "従業員が現在どれくらいのグローバル知識を保有しているのか？個人の課題は何なのかを無料コーチングを実施し、必要な知識が何かを明確にします。",
		image: "/img/points-01.png",
		imagePosition: "right",
	},
	{
		title: "異業種・異文化交流",
		description: "様々な業界や異業種、世界各国から集まる仲間との交流を通してグローバルビジネスを体感することができます。",
		image: "/img/points-02.png",
		imagePosition: "left",
	},
	{
		title: "50を超えるプログラムから対面研修のカスタマイズも可能",
		description: "教育担当の皆様にも50を超えるプログラムの中から実際にさまざまなスキル研修を実際に受けていただくことが可能です。それらの体験を通し、ご自身の会社課題の解決につながりそうな複数のウェビナーを組み合わせた対面研修（別途契約）のご提案も可能です。",
		image: "/img/points-03.jpg",
		imagePosition: "right",
		cta: {
			label: "プログラム一覧はこちらから",
			href: "/programs",
		},
	},
	{
		title: "レポーティング機能",
		description: "■学習状況の把握（正規契約後にご利用可能）\n\nレポーティングシステムを通じて、受講生の出席状況や人気講座などを会社全体や部門ごとにご覧いただき、分野別の関心度などの傾向を把握できます。\n\n\n■企業課題の把握（正規契約後にご利用可能）\n\nレポーティングシステムを通じて、無料コーチング結果から受講生の課題を会社全体や部門ごとにご覧いただき、グローバルにおける社内課題などの傾向を把握できます。",
		image: "/img/points-04.png",
		imagePosition: "left",
	},
];

export default function EnterprisePointsSection() {
	return (
		<section className="bg-white">
			<div className="mx-auto px-6">
				{points.map((point, index) => (
					<div key={index} className={`relative py-16 ${index % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>
						<div className={`mx-auto flex max-w-6xl flex-col items-center gap-16 px-6 md:flex-row ${point.imagePosition === "right" ? "md:flex-row-reverse" : ""}`}>
							{/* Image */}
							<div className="relative w-full max-w-[300px] shrink-0">
								<div className="absolute -inset-2 rounded-2xl border border-slate-200" />
								<div className="relative aspect-[19/15] w-[300px] overflow-hidden rounded-2xl bg-slate-100">
									<Image src={point.image} alt={point.title} fill sizes="300px" className="object-cover" priority={index === 0} />
								</div>
							</div>

							{/* Content */}
							<div className="relative max-w-xl space-y-6">
								<div className="flex items-center gap-3">
									<span className="h-5 w-1 rounded-full bg-[#153d63]" />
									<span className="text-xs font-semibold tracking-widest text-[#153d63]">POINT {index + 1}</span>
								</div>

								<h3 className="text-2xl font-semibold leading-snug text-slate-900">{point.title}</h3>

								{/* Description (preserve line breaks & bullets) */}
								<div className="space-y-4 text-sm leading-relaxed text-slate-600 whitespace-pre-line">{point.description}</div>

								{/* CTA Button (only for point 3) */}
								{point.cta && (
									<a href={point.cta.href} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100">
										{point.cta.label}
										<span aria-hidden>→</span>
									</a>
								)}
							</div>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
