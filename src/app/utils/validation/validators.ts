import { ValidationError } from "./ErrorValidator";

export const Validators = {
	/**
	 * Ensures value exists (not null, undefined, or empty string)
	 */
	required(value: unknown, field: string): void {
		if (value === undefined || value === null || value === "") {
			throw new ValidationError(`${field} is required`);
		}
	},

	/**
	 * Ensures value is a string
	 */
	string(value: unknown, field: string): void {
		if (typeof value !== "string") {
			throw new ValidationError(`${field} must be a string`);
		}
	},

	/**
	 * Trims string and ensures it's not empty
	 * Returns sanitized string
	 */
	trim(value: unknown, field: string): string {
		if (typeof value !== "string") {
			throw new ValidationError(`${field} must be a string`);
		}

		const trimmed = value.trim();

		if (!trimmed) {
			throw new ValidationError(`${field} cannot be empty`);
		}

		return trimmed;
	},

	/**
	 * Validates email format
	 */
	email(value: unknown, field = "Email"): void {
		if (typeof value !== "string") {
			throw new ValidationError(`${field} must be a string`);
		}

		const email = value.trim();

		const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

		if (!isValid) {
			throw new ValidationError(`Invalid ${field.toLowerCase()}`);
		}
	},

	/**
	 * Ensures minimum string length
	 */
	minLength(value: unknown, min: number, field: string): void {
		if (typeof value !== "string") {
			throw new ValidationError(`${field} must be a string`);
		}

		if (value.length < min) {
			throw new ValidationError(`${field} must be at least ${min} characters`);
		}
	},

	/**
	 * Ensures maximum string length
	 */
	maxLength(value: unknown, max: number, field: string): void {
		if (typeof value !== "string") {
			throw new ValidationError(`${field} must be a string`);
		}

		if (value.length > max) {
			throw new ValidationError(`${field} must be at most ${max} characters`);
		}
	},
};
