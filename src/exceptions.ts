import { z } from "zod";
import { contentJson } from "./contentTypes";

export class ApiException extends Error {
  isVisible = true;
  message: string;
  default_message = "Internal Error";
  status = 500;
  code = 7000;
  includesPath = false;

  constructor(message = "") {
    super(message);
    this.message = message;
  }

  buildResponse() {
    return [
      {
        code: this.code,
        message: this.isVisible ? this.message || this.default_message : "Internal Error",
      },
    ];
  }

  static schema() {
    const inst = new this();
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
          success: z.literal(false),
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

export class MultiException extends ApiException {
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
    return this.errors.flatMap((err) => err.buildResponse());
  }
}

export class NotFoundException extends ApiException {
  isVisible = true;
  default_message = "Not Found";
  status = 404;
  code = 7002;
}
