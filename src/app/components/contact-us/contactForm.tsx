"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export default function ContactForm() {
	const t = useTranslations("contact");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();

		const form = e.currentTarget;

		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		setLoading(true);

		try {
			const formData = new FormData(form);

			const res = await fetch("/api/contact/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					firstName: formData.get("firstName"),
					lastName: formData.get("lastName"),
					email: formData.get("email"),
					message: formData.get("message"),
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data?.error || "Request failed");
			}

			toast.success(t("form.success"));
			form.reset();
		} catch {
			toast.error(t("form.error"));
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="bg-white rounded-4xl border border-gray-300 shadow-xl p-4 sm:p-8">
			<h2 className="text-2xl font-semibold mb-8">{t("form.title")}</h2>

			<form className="grid gap-6" onSubmit={handleSubmit}>
				{["firstName", "lastName", "email"].map((name) => (
					<div key={name} className="relative">
						<label className="absolute -top-2 left-3 bg-white px-1 text-sm font-medium text-gray-700">
							{t(`form.${name}`)}
							<span className="text-red-500 ml-1">*</span>
						</label>
						<input name={name} type={name === "email" ? "email" : "text"} required minLength={1} maxLength={50} autoComplete={name === "email" ? "email" : name === "firstName" ? "given-name" : "family-name"} className="input" />
					</div>
				))}

				<div className="relative">
					<label className="absolute -top-2 left-3 bg-white px-1 text-sm font-medium text-gray-700">
						{t("form.message")}
						<span className="text-red-500 ml-1">*</span>
					</label>
					<textarea name="message" required minLength={10} maxLength={2000} rows={5} className="input resize-none" />
				</div>

				<button type="submit" disabled={loading} className="flex justify-center items-center gap-2 rounded-full bg-[#1f497c] text-white px-10 py-3 font-medium shadow-lg disabled:opacity-50">
					<Send className="w-4 h-4" />
					{loading ? t("form.sending") : t("form.send")}
				</button>
			</form>

			<style jsx>{`
				.input {
					width: 100%;
					border-radius: 0.75rem;
					border: 1px solid #cbd5f5;
					padding: 0.75rem 1rem;
				}
			`}</style>
		</div>
	);
}
