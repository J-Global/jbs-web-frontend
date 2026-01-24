export class ValidationError extends Error {
	public readonly status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = "ValidationError";
		this.status = status;
	}
}

export function isValidationError(error: unknown): error is ValidationError {
	return error instanceof ValidationError;
}
