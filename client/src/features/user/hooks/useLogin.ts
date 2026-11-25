import { useRef, useState } from "react";
import { type LoginPayload, loginSchema, type PublicUser } from "shared";
import { ApiError } from "../../../services/apiError";
import { login as loginRequest } from "../services/authService";

export type LoginField = "identifier" | "password";
export type LoginFieldErrors = Partial<Record<LoginField, string>>;

// Sends the login form. Empty fields are caught before any request; a wrong
// login gives one single message at the top, never a field in error.
export function useLogin() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // A ref, not a state: it is read in the same instant a second click arrives.
  const inFlight = useRef(false);

  // Returns the connected user, or null when something went wrong.
  async function submit(payload: LoginPayload): Promise<PublicUser | null> {
    if (inFlight.current) {
      return null;
    }
    setFormError(null);

    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: LoginFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          (field === "identifier" || field === "password") &&
          !errors[field]
        ) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return null;
    }
    setFieldErrors({});

    inFlight.current = true;
    setIsSubmitting(true);
    try {
      return await loginRequest(parsed.data);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Une erreur est survenue. Réessaie plus tard.",
      );
      return null;
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, fieldErrors, formError, submit };
}
