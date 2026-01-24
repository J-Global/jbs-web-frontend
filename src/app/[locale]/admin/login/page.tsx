"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const router = useRouter();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		const res = await fetch("/api/admin/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password }),
		});

		if (!res.ok) {
			setError("Invalid password");
			return;
		}

		router.push("/admin");
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<form onSubmit={handleSubmit} className="w-80 space-y-4">
				<h1 className="text-xl font-semibold text-center">Admin Login</h1>

				<input type="password" placeholder="Admin password" className="w-full border p-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} />

				{error && <p className="text-red-600 text-sm">{error}</p>}

				<button className="w-full bg-black text-white p-2 rounded">Login</button>
			</form>
		</div>
	);
}
