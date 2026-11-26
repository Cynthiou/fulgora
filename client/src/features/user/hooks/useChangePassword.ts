import { useRef, useState } from "react";
import {
  type ChangePasswordPayload,
  changePasswordSchema,
  WRONG_PASSWORD_MESSAGE,
} from "shared";
import { ApiError } from "../../../services/apiError";
import { changePassword } from "../services/authService";

export const PASSWORD_FIELDS = [
  "current_password",
  "new_password",
  "confirm_password",
] as const;

export type PasswordField = (typeof PASSWORD_FIELDS)[number];
export type PasswordFieldErrors = Partial<Record<PasswordField, string>>;

function isPasswordField(field: string): field is PasswordField {
  return (PASSWORD_FIELDS as readonly string[]).includes(field);
}

// US-47: the three fields are checked here with the same schema as the
// server, so most mistakes are shown without a round trip. Only the
// current password needs the server (422).
export function useChangePassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // A ref, not a state: read in the same instant a second click arrives.
  const inFlight = useRef(false);

  async function submit(payload: ChangePasswordPayload): Promise<boolean> {
    if (inFlight.current) {
      return false;
    }
    setFormError(null);

    const parsed = changePasswordSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: PasswordFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (isPasswordField(field) && errors[field] === undefined) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return false;
    }

    inFlight.current = true;
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      await changePassword(parsed.data);
      return true;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "WRONG_CURRENT_PASSWORD"
      ) {
        setFieldErrors({ current_password: WRONG_PASSWORD_MESSAGE });
      } else if (error instanceof ApiError && error.status === 429) {
        setFormError("Trop d'essais. Réessaie dans quelques minutes.");
      } else {
        setFormError("Changement impossible. Réessaie.");
      }
      return false;
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, fieldErrors, formError, submit };
}
