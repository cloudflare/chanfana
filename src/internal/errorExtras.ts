type DocumentedError = { documentation_url?: string | undefined };

// documentation_url values passed to ApiException constructors. Kept outside the instance so the
// constructor option wins over subclass field initializers, which run after the base constructor.
const documentationUrlOptions = new WeakMap<object, string>();

export function setDocumentationUrlOption(exc: object, documentationUrl: string | undefined): void {
  if (documentationUrl !== undefined) {
    documentationUrlOptions.set(exc, documentationUrl);
  }
}

/**
 * Returns the effective documentation_url of an exception: the constructor option, else the class property.
 */
export function getDocumentationUrl(exc: DocumentedError): string | undefined {
  return documentationUrlOptions.get(exc) ?? exc.documentation_url;
}

/**
 * Adds the optional `documentation_url` member to an error object.
 */
export function withErrorExtras<T extends object>(exc: DocumentedError, error: T) {
  const documentationUrl = getDocumentationUrl(exc);
  return {
    ...error,
    ...(documentationUrl ? { documentation_url: documentationUrl } : {}),
  };
}
