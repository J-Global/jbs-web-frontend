// utils/sanitizeEmailHtml.ts
import sanitizeHtml from "sanitize-html";

export function sanitizeEmailMessage(message: string) {
	return sanitizeHtml(message, {
		allowedTags: ["br"],
		allowedAttributes: {},
		disallowedTagsMode: "discard",
	});
}
