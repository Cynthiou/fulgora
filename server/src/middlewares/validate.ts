import type { RequestHandler } from "express";
import { trimStrings, type ValidationField } from "shared";
import type { ZodType } from "zod";
import { ValidationError } from "../utils/httpError.js";

// One optional schema per part of the request.
type RequestSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

const PARTS = ["params", "query", "body"] as const;

// Checks each part against its schema. On success the part is replaced by the
// cleaned version (trimmed strings, unknown keys removed, "12" turned into 12).
// On failure, nothing reaches the action: 400 with every field in error.
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const fields: ValidationField[] = [];

    for (const part of PARTS) {
      const schema = schemas[part];
      if (schema === undefined) {
        continue;
      }

      const result = schema.safeParse(trimStrings(req[part]));

      if (!result.success) {
        for (const issue of result.error.issues) {
          fields.push({
            field: issue.path.map(String).join("."),
            message: issue.message,
          });
        }
        continue;
      }

      // req.query is read-only in Express 5: defineProperty replaces it anyway.
      Object.defineProperty(req, part, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    if (fields.length > 0) {
      next(new ValidationError(fields));
      return;
    }

    next();
  };
}
