import { useReducer } from "react";
import type { SessionDraft } from "shared";
import {
  type SessionDraftAction,
  sessionDraftReducer,
} from "./sessionDraftReducer";

type State = {
  draft: SessionDraft;
  // True as soon as something changed since the start or the last save.
  isDirty: boolean;
};

type Action = SessionDraftAction | { type: "markSaved" };

function reducer(state: State, action: Action): State {
  if (action.type === "markSaved") {
    return state.isDirty ? { ...state, isDirty: false } : state;
  }
  const draft = sessionDraftReducer(state.draft, action);
  // The reducer gives back the same object when nothing changed.
  return draft === state.draft ? state : { draft, isDirty: true };
}

// The draft of the editor, driven by actions (useReducer), plus whether it
// has unsaved changes (for the exit confirmation).
// A draft restored from storage or started with exercises is already dirty.
export function useSessionDraft(
  initialDraft: SessionDraft,
  initiallyDirty = false,
) {
  const [state, dispatch] = useReducer(reducer, {
    draft: initialDraft,
    isDirty: initiallyDirty,
  });

  return {
    draft: state.draft,
    isDirty: state.isDirty,
    dispatch: (action: SessionDraftAction) => dispatch(action),
    markSaved: () => dispatch({ type: "markSaved" }),
  };
}
