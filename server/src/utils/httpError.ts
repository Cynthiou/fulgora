import type { ValidationField } from "shared";

// An error the client is allowed to see: a status, a stable code the client
// can test, a French message it can display as is, and optionally the field
// at fault. Anything else that reaches the error handler becomes a generic 500.
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field?: string;

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

// Invalid data: a 400 that also lists every field in error.
export class ValidationError extends HttpError {
  readonly fields: ValidationField[];

  constructor(fields: ValidationField[]) {
    super(400, "VALIDATION_ERROR", "Certaines données sont invalides.");
    this.name = "ValidationError";
    this.fields = fields;
  }
}
