export class ApiException extends Error {
  // @ts-ignore
  key: string

  constructor(message: any) {
    super(message)
    this.message = message
  }
}

export class ValidationError extends ApiException {
  constructor(message: any) {
    super(message)
  }
}

export class InputValidationException extends ApiException {
  constructor(message: any) {
    super(message)
  }
}
