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

export function jsonResp(data: unknown, params?: object): Response {
  const init = params as ResponseInit | undefined;
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json",
    },
    status: init?.status ? init.status : 200,
    ...init,
  });
}

type ApiExceptionLike = Error & {
  buildResponse: () => unknown;
  status: number;
  retryAfter?: number;
};

function isApiExceptionLike(e: unknown): e is ApiExceptionLike {
  return e instanceof Error && "buildResponse" in e && typeof e.buildResponse === "function";
}

/**
 * Formats a chanfana error (ApiException) into a JSON Response.
 * Returns null if the error is not a recognized chanfana error type.
 *
 * Raw ZodErrors are intentionally not handled here: request validation failures are already
 * wrapped in InputValidationException by validateRequest(), so any other ZodError comes from
 * the handler's own logic and is treated as an unknown error.
 */
export function formatChanfanaError(e: unknown): Response | null {
  // ApiException: check by shape to avoid circular dependency with exceptions.ts
  if (isApiExceptionLike(e)) {
    const apiError = e;
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (apiError.retryAfter !== undefined) {
      headers["Retry-After"] = String(apiError.retryAfter);
    }
    return new Response(
      JSON.stringify({
        success: false,
        errors: apiError.buildResponse(),
        result: null,
      }),
      {
        status: apiError.status,
        headers,
      },
    );
  }

  return null;
}
