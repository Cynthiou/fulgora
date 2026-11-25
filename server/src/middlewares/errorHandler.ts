import type { ErrorRequestHandler } from "express";
import type { ValidationField } from "shared";
import { HttpError, ValidationError } from "../utils/httpError.js";

// Every error answer has the same shape:
// { error: { code, message, field?, fields? } }.
function sendError(
  res: Parameters<ErrorRequestHandler>[2],
  status: number,
  code: string,
  message: string,
  field?: string,
  fields?: ValidationField[],
) {
  res.status(status).json({ error: { code, message, field, fields } });
}

// Errors raised by express.json() carry a "type" string.
function isBodyParserError(err: unknown): err is { type: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    typeof err.type === "string"
  );
}

// Last stop for every error. Known errors keep their status and message,
// unknown ones are logged on the server and hidden behind a generic 500.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    sendError(res, err.status, err.code, err.message, undefined, err.fields);
    return;
  }

  if (err instanceof HttpError) {
    sendError(res, err.status, err.code, err.message, err.field);
    return;
  }

  if (isBodyParserError(err) && err.type === "entity.too.large") {
    sendError(res, 413, "PAYLOAD_TOO_LARGE", "Requête trop volumineuse.");
    return;
  }

  if (isBodyParserError(err) && err.type === "entity.parse.failed") {
    sendError(res, 400, "INVALID_JSON", "Corps de requête illisible.");
    return;
  }

  console.error(err);
  sendError(
    res,
    500,
    "INTERNAL_ERROR",
    "Une erreur est survenue. Réessaie plus tard.",
  );
};
