import { contentJson } from "./contentTypes";

export class ApiException extends Error {
	isVisible = false;
	message: string;
	default_message = "Internal Error";
	status = 500;
	code = 7000;
	includesPath = false;

	constructor(message?: string) {
		super(message);
		this.message = message || this.default_message;
	}

	buildResponse() {
		return [
			{
				code: this.code,
				message: this.isVisible ? this.message : "Internal Error",
			},
		];
	}

	static schema() {
		const inst = new ApiException();
		const innerError = {
			code: inst.code,
			message: inst.default_message,
		};

		if (inst.includesPath === true) {
			// @ts-ignore
			innerError.path = ["body", "fieldName"];
		}

		return {
			[inst.status]: {
				description: inst.default_message,
				...contentJson({
					success: false,
					errors: [innerError],
				}),
			},
		};
	}
}

export class InputValidationException extends ApiException {
	isVisible = true;
	default_message = "Input Validation Error";
	status = 400;
	code = 7001;
	path = null;
	includesPath = true;

	constructor(message?: string, path?: any) {
		super(message);
		this.path = path;
	}

	buildResponse() {
		return [
			{
				code: this.code,
				message: this.isVisible ? this.message : "Internal Error",
				path: this.path,
			},
		];
	}
}

export class MultiException extends Error {
	isVisible = true;
	errors: Array<ApiException>;
	status = 400;

	constructor(errors: Array<ApiException>) {
		super("Multiple Exceptions");
		this.errors = errors;

		// Because the API can only return 1 status code, always return the highest
		for (const err of errors) {
			if (err.status > this.status) {
				this.status = err.status;
			}

			if (!err.isVisible && this.isVisible) {
				this.isVisible = false;
			}
		}
	}

	buildResponse() {
		return this.errors.map((err) => err.buildResponse()[0]);
	}
}

export class NotFoundException extends ApiException {
	isVisible = true;
	default_message = "Not Found";
	status = 404;
	code = 7002;
}