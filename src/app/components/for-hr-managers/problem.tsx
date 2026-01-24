import Image from "next/image";
import { ChevronDown } from "lucide-react";

export default function ProblemsSection() {
	return (
		<div>
			<section className="bg-white py-28">
				<div className="mx-auto max-w-6xl px-6">
					{/* Card container */}
					<div className="relative rounded-3xl border border-slate-200 bg-white px-8 py-16 shadow-sm lg:px-16">
						{/* Title */}
						<div className="mb-16 text-center">
							<h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">こんなお悩みはありませんか？</h2>
							<div className="mx-auto mt-5 h-[2px] w-16 bg-slate-900" />
						</div>

						{/* Content */}
						<div className="grid items-center gap-16 lg:grid-cols-[320px_1fr]">
							{/* Image */}
							<div className="flex justify-center">
								<div className="relative h-64 w-64 overflow-hidden rounded-full bg-slate-100 shadow-md">
									<Image src="/img/problems-image.png" alt="Business problem illustration" fill className="object-cover" />
								</div>
							</div>

							{/* List */}
							<ul className="space-y-10">
								{["海外赴任者が赴任先で良いパフォーマンスを発揮できない", "国内勤務の海外従業員と日本人従業員とのコミュニケーションが上手くいかない", "グローバル化に向けた様々な知識が不足している"].map((text, index) => (
									<li key={index} className="flex gap-5">
										<span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-600">
											<ChevronDown size={16} />
										</span>
										<p className="max-w-xl text-base leading-relaxed text-slate-700">{text}</p>
									</li>
								))}
							</ul>
						</div>

						{/* Subtle bottom notch */}
						<div className="absolute left-1/2 top-full -translate-x-1/2">
							<div className="h-0 w-0 border-l-[16px] border-r-[16px] border-t-[16px] border-l-transparent border-r-transparent border-t-white" />
							<div className="relative -top-[15px] h-0 w-0 border-l-[17px] border-r-[17px] border-t-[17px] border-l-transparent border-r-transparent border-t-[#1e4f8f]" />
						</div>
					</div>

					{/* Bottom statement */}
					<div className="mx-auto mt-20 max-w-3xl text-center">
						<p className="text-lg font-semibold text-slate-900">そのお悩み、研修だけで解決できますか？</p>
						<p className="mt-4 text-base leading-relaxed text-slate-600">J-Globalが提供するオンラインビジネススクールが、その本質的な課題を解決します。</p>
					</div>
				</div>
			</section>
			<section className="w-screen bg-[#0c2a45]">
				<div className="flex min-h-[220px] items-center justify-center px-6 text-center">
					<h2 className="max-w-3xl text-2xl font-semibold leading-relaxed tracking-tight text-white md:text-3xl">
						J-Globalのビジネススクールが
						<br />
						<span className="text-white/90">企業から支持される4つのポイント</span>
					</h2>
				</div>
			</section>
		</div>
	);
}
