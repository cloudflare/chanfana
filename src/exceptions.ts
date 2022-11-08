export class ApiException extends Error {
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
