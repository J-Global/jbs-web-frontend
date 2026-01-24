// MessageModal.tsx - Create this as a separate file
"use client";

import { useState } from "react";
import { MessageSquare, X } from "lucide-react";

export default function MessageModal({ name, message }: { name: string; message: string }) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<button onClick={() => setIsOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
				<MessageSquare className="w-4 h-4" />
				View Message
			</button>

			{isOpen && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
					<div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between p-6 border-b border-slate-200">
							<div>
								<h2 className="text-xl font-semibold text-slate-900">Message from {name}</h2>
								<p className="text-sm text-slate-500 mt-1">Client inquiry</p>
							</div>
							<button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
								<X className="w-5 h-5 text-slate-600" />
							</button>
						</div>
						<div className="p-6 overflow-y-auto max-h-[60vh]">
							<p className="text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{message}</p>
						</div>
						<div className="p-6 border-t border-slate-200 bg-slate-50">
							<button onClick={() => setIsOpen(false)} className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium">
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
