import type { ValidationField } from "shared";

// An error answered by the server, in its common format
// { error: { code, message, field?, fields? } }, or a network failure
// (status 0, code NETWORK_ERROR). The message is French and displayable as is.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field?: string;
  readonly fields: ValidationField[];

  constructor(
    status: number,
    code: string,
    message: string,
    field?: string,
    fields: ValidationField[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.field = field;
    this.fields = fields;
  }
}
