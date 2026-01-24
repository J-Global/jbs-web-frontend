"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";

export default function LogoutButton() {
	const router = useRouter();
	const [showConfirm, setShowConfirm] = useState(false);

	const logout = async () => {
		await fetch("/api/admin/logout", { method: "POST" });
		router.replace("/admin/login");
	};

	return (
		<>
			<button onClick={() => setShowConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium">
				<LogOut className="w-4 h-4" />
				Log out
			</button>

			{/* Confirmation Modal */}
			{showConfirm && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
					<div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between p-6 border-b border-slate-200">
							<div>
								<h2 className="text-xl font-semibold text-slate-900">Confirm Logout</h2>
								<p className="text-sm text-slate-500 mt-1">Are you sure you want to log out?</p>
							</div>
							<button onClick={() => setShowConfirm(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
								<X className="w-5 h-5 text-slate-600" />
							</button>
						</div>
						<div className="p-6">
							<p className="text-slate-600">You will need to log in again to access the admin dashboard.</p>
						</div>
						<div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
							<button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
								Cancel
							</button>
							<button onClick={logout} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
								Log Out
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
