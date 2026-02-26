import { z } from "zod";

/**
 * Validates the format of a base path option.
 * @param base - The base path string to validate
 * @throws Error if the base path doesn't start with "/" or ends with "/"
 */
export function validateBasePath(base: string): void {
  if (!base.startsWith("/")) {
    throw new Error(`base must start with "/", got "${base}"`);
  }
  if (base.endsWith("/")) {
    throw new Error(`base must not end with "/", got "${base}"`);
  }
}

export function jsonResp(data: any, params?: object): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json;charset=UTF-8",
    },
    // @ts-expect-error
    status: params?.status ? params.status : 200,
    ...params,
  });
}

/**
 * Formats a chanfana error (ZodError or ApiException) into a JSON Response.
 * Returns null if the error is not a recognized chanfana error type.
 */
export function formatChanfanaError(e: unknown): Response | null {
  // ZodError: convert to InputValidationException format ({code: 7001, message, path})
  // so that direct z.ZodError throws from handle() produce the same shape as
  // validation errors from validateRequest().
  if (e instanceof z.ZodError) {
    return jsonResp(
      {
        errors: e.issues.map((issue) => ({
          code: 7001,
          message: issue.message,
          path: issue.path.map(String),
        })),
        success: false,
        result: {},
      },
      {
        status: 400,
      },
    );
  }

  // ApiException: check by shape to avoid circular dependency with exceptions.ts
  if (e instanceof Error && "buildResponse" in e && typeof (e as any).buildResponse === "function") {
    const apiError = e as unknown as { buildResponse: () => any; status: number; retryAfter?: number };
    const headers: Record<string, string> = {
      "content-type": "application/json;charset=UTF-8",
    };
    if (apiError.retryAfter !== undefined) {
      headers["Retry-After"] = String(apiError.retryAfter);
    }
    return new Response(
      JSON.stringify({
        success: false,
        errors: apiError.buildResponse(),
        result: {},
      }),
      {
        status: apiError.status,
        headers,
      },
    );
  }

  return null;
}
