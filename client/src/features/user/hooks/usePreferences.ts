import { useState } from "react";
import type { UpdatePreferencesInput, UserPreferences } from "shared";
import { useAuth } from "../../../hooks/useAuth";
import { updatePreferences } from "../services/authService";

// US-05: the preferences of the connected user. Every change is saved at
// once (no "Enregistrer" button) and applied everywhere (RM-005). While the
// request runs, the control is disabled; if it fails, the old value comes
// back with a message.
export function usePreferences() {
  const { user, refresh } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(values: UpdatePreferencesInput): Promise<boolean> {
    if (isSaving) {
      return false;
    }
    setIsSaving(true);
    setError(null);
    try {
      refresh(await updatePreferences(values));
      return true;
    } catch {
      setError("Impossible d'enregistrer ce réglage. Réessaie.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    preferences: (user?.preferences ?? null) as UserPreferences | null,
    isSaving,
    error,
    save,
  };
}
