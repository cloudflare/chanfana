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
