export default function FreeTrialSection() {
	return (
		<section className="bg-white">
			{/* Top header bar */}
			<div className="bg-[#153d63] py-12 text-center">
				<h2 className="text-2xl font-semibold tracking-wide text-white">無料トライアル</h2>
			</div>

			<div className="mx-auto max-w-5xl px-6 py-24 text-center">
				<p className="text-lg leading-relaxed text-slate-800">
					HRマネージャー様など、会社の代表者様には導入前に
					<br />
					すべて無料で6ヶ月お試し可能です
				</p>

				<p className="mt-10 text-sm leading-loose text-slate-600">
					5つのテーマ別プログラムタイプから学びたいトピックを自由に選ぶことができます。
					<br />
					企業クーポンコードを利用し、一括管理もすることができます。
					<br />
					まずはご担当者様のみ利用し、後からチームメンバーを追加することもできます。
				</p>

				{/* Flow title */}
				<h3 className="mt-28 text-2xl font-semibold text-[#153d63]">ご利用の流れ</h3>

				{/* Steps */}
				<div className="mt-20 grid grid-cols-1 gap-14 md:grid-cols-3">
					{/* STEP CARD */}
					{[
						{
							step: "STEP1",
							title: "企業クーポンコードをGET！",
							text: (
								<>
									下のお問い合わせフォームから
									<br />
									「企業クーポンコード」をGet
								</>
							),
						},
						{
							step: "STEP2",
							title: "会員登録 & ログイン",
							text: (
								<>
									こちらの専用ウェブページの
									<br />
									「会員登録」に企業クーポンコードを入力して登録＆ログイン
								</>
							),
						},
						{
							step: "STEP3",
							title: "プログラムが受講し放題",
							text: (
								<>
									マイページにログイン後、
									<br />
									「プログラム」や「登録」タブから
									<br />
									受講したいウェビナーを登録
								</>
							),
						},
					].map((item) => (
						<div key={item.step} className="relative">
							{/* Offset border (stacked look) */}
							<div className="absolute -inset-2 rounded-3xl border border-slate-200" />

							{/* Card */}
							<div className="relative rounded-3xl bg-white px-8 pb-12 pt-16">
								{/* STEP pill */}
								<span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#153d63] bg-white px-6 py-2 text-xs font-semibold tracking-widest text-[#153d63]">{item.step}</span>

								<h4 className="text-lg font-semibold text-[#153d63]">{item.title}</h4>

								<p className="mt-6 text-sm leading-relaxed text-slate-600">{item.text}</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
