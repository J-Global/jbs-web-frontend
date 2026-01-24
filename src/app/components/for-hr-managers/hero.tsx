"use client";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import LanguageSwitcher from "../LanguageSwitcher";

export default function Hero() {
	const scrolled = true;

	return (
		<div className="relative min-h-screen overflow-hidden">
			{/* Background Image */}
			<div className="absolute inset-0 -z-20">
				<Image
					src="/img/sun-tornado.svg"
					alt="Background pattern"
					fill
					className="object-cover" // or "object-repeat"
					priority
					style={{ opacity: 0.7 }}
				/>
			</div>

			{/* Navbar */}
			<header className={`fixed top-0 left-0 right-0 z-50 mx-auto flex w-full items-center justify-between px-6 py-2 transition-colors duration-300 ${scrolled ? "bg-white shadow-md" : "bg-transparent"}`}>
				<div className="max-w-7xl flex w-full items-center justify-between mx-auto">
					<Link href="/" className="flex items-center">
						<Image src="/logo.avif" alt="Prebuilt UI Logo" width={120} height={40} className="h-auto w-24 sm:w-32 md:w-32 object-contain" priority />
					</Link>
					<div className="flex items-center space-x-4">
						<LanguageSwitcher />
					</div>
				</div>
			</header>
			<section className="relative overflow-hidden bg-gradient-to-b from-[#0c2a45] to-[#153d63] text-white">
				{/* Decorative grid / lines */}
				<div className="pointer-events-none absolute inset-0 opacity-30">
					<div className="absolute left-1/3 top-0 h-full w-px border-l border-dashed border-white/40" />
					<div className="absolute right-1/4 top-0 h-full w-px border-l border-dashed border-white/40" />
				</div>

				<div className="relative mx-auto max-w-7xl px-6 py-24">
					<div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
						{/* Left: Image */}
						<div className="relative flex justify-center lg:justify-start">
							<Image src="/img/hero-jon.png" alt="Business Instructor" width={520} height={680} priority className="drop-shadow-2xl" />
						</div>

						{/* Right: Content */}
						<div className="space-y-8">
							{/* Small label */}
							<div className="inline-flex items-center gap-2 border border-white/40 px-4 py-1 text-sm">
								<span className="h-3 w-3 border border-white" />
								法人のお客様
							</div>

							{/* Title */}
							<h1 className="text-4xl font-bold leading-tight lg:text-5xl">
								J-Globalのサブスク型
								<br />
								異文化ビジネススクール
							</h1>

							{/* Subtitle */}
							<p className="max-w-xl text-sm text-white/80">グローバルの世界へ、学ぶだけではない交流や文化を知る</p>

							{/* Buttons */}
							<div className="flex flex-col gap-4 sm:flex-row">
								<a href="#trial" className="inline-flex items-center justify-center bg-[#f5a623] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#e0941e]">
									1ヶ月の無料トライアルの申し込み
								</a>

								<Link href="/login" className="inline-flex items-center justify-center border border-white bg-white px-8 py-4 text-sm font-semibold text-[#0c2a45] transition hover:bg-gray-100">
									ログインはこちらから
								</Link>
							</div>
						</div>
					</div>
				</div>

				{/* Decorative geometric shapes */}
				<div className="pointer-events-none absolute left-20 top-24 h-32 w-32 border border-white/30 rotate-45" />
				<div className="pointer-events-none absolute right-32 bottom-24 h-48 w-48 border border-white/20 rotate-45" />
			</section>
		</div>
	);
}
