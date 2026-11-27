import { useEffect, useState } from "react";
import { type SetLine, toSetLines } from "shared";
import { isAbortError } from "../../../services/api";
import { readLastSets } from "../services/lastSetsService";

export type LastSets = {
  // The line the exercise was last done with, null when never done
  line: SetLine | null;
  // False until the server has answered: the sheet says nothing meanwhile
  isKnown: boolean;
};

// "Dernière fois" of the handoff: the first line of the last finished
// session that holds this exercise. A failure stays quiet, it only means
// the sheet shows nothing there.
export function useLastSets(exerciseId: number): LastSets {
  const [last, setLast] = useState<LastSets>({ line: null, isKnown: false });

  useEffect(() => {
    const controller = new AbortController();
    setLast({ line: null, isKnown: false });

    readLastSets(exerciseId, controller.signal)
      .then((sets) => {
        const lines = toSetLines(sets);
        setLast({ line: lines[0] ?? null, isKnown: true });
      })
      .catch((caught: unknown) => {
        if (!isAbortError(caught)) {
          setLast({ line: null, isKnown: false });
        }
      });

    return () => controller.abort();
  }, [exerciseId]);

  return last;
}
