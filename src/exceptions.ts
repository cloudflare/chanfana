export class ApiException extends Error {
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
