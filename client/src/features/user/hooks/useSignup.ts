import { useRef, useState } from "react";
import { type PublicUser, type SignupPayload, signupSchema } from "shared";
import { ApiError } from "../../../services/apiError";
import { createUser } from "../services/userService";

export const SIGNUP_FIELDS = [
  "username",
  "email",
  "password",
  "terms_accepted",
] as const;

export type SignupField = (typeof SIGNUP_FIELDS)[number];
export type SignupFieldErrors = Partial<Record<SignupField, string>>;

function isSignupField(field: string): field is SignupField {
  return (SIGNUP_FIELDS as readonly string[]).includes(field);
}

// Keeps the first message of each field, in the order of the form.
function toFieldErrors(
  entries: { field: string; message: string }[],
): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  for (const { field, message } of entries) {
    if (isSignupField(field) && errors[field] === undefined) {
      errors[field] = message;
    }
  }
  return errors;
}

// Sends the signup form. The same schema as the server checks the form first,
// so most mistakes are shown without a round trip.
export function useSignup() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // The code of the last server error, for example "EMAIL_TAKEN".
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  // A ref, not a state: it is read in the same instant a second click arrives.
  const inFlight = useRef(false);

  // Returns the created user, or null when something went wrong (the errors
  // are then available in fieldErrors / formError).
  async function submit(payload: SignupPayload): Promise<PublicUser | null> {
    if (inFlight.current) {
      return null;
    }
    setFormError(null);
    setLastErrorCode(null);

    const parsed = signupSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(
        toFieldErrors(
          parsed.error.issues.map((issue) => ({
            field: String(issue.path[0]),
            message: issue.message,
          })),
        ),
      );
      return null;
    }
    setFieldErrors({});

    inFlight.current = true;
    setIsSubmitting(true);
    try {
      return await createUser(parsed.data);
    } catch (error) {
      if (error instanceof ApiError) {
        setLastErrorCode(error.code);
        if (error.field !== undefined) {
          setFieldErrors(
            toFieldErrors([{ field: error.field, message: error.message }]),
          );
        } else if (error.fields.length > 0) {
          setFieldErrors(toFieldErrors(error.fields));
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Une erreur est survenue. Réessaie plus tard.");
      }
      return null;
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, fieldErrors, formError, lastErrorCode, submit };
}
