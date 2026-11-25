import * as z from "zod";
import {
  BLOCK_TYPE_LABELS,
  type DraftBlock,
  type DraftExercise,
  formatDuration,
  formatSetSummary,
  type PlannedSetValues,
  type SessionDraft,
  sessionDraftSchema,
} from "./session-template.js";

// Modifying a planned session (US-17). A change never touches the version
// already saved: it creates a new one (RM-017).

// What GET /api/appointments/:id/session gives back: the current version
// turned back into a draft, ready for the editor.
export type EditableSession = {
  appointment_id: number;
  session_version_id: number;
  // null for a free session (RM-015)
  program_name: string | null;
  // "Cette séance et les suivantes" only exists inside a program (RM-030)
  can_apply_to_following: boolean;
  session: SessionDraft;
};

// "this": this appointment only. "following": it and the next ones of the
// same program (RM-029, RM-030).
export const EDIT_SCOPES = ["this", "following"] as const;
export type EditScope = (typeof EDIT_SCOPES)[number];

// What PUT /api/appointments/:id/session receives. The date and the time
// travel along but are never applied: changing them is "Déplacer" (US-25).
export const sessionEditSchema = z.object({
  scope: z.enum(EDIT_SCOPES, { error: "Portée de modification inconnue." }),
  session: sessionDraftSchema,
});

export type SessionEditInput = z.output<typeof sessionEditSchema>;

// The answer of a successful change.
export type SessionEdited = {
  version_id: number;
  updated_appointment_ids: number[];
};

// --- The changes shown before validating (CAL-06b) ---------------------------

// "added": a line with a +, "removed": a line with a − (struck through on
// screen), "changed": "avant → après".
export type SessionChangeKind = "added" | "removed" | "changed";

export type SessionChange = {
  kind: SessionChangeKind;
  text: string;
};

// "Force" when the block has a title, "Bloc 2" otherwise.
function blockTitle(block: Pick<DraftBlock, "name">, index: number): string {
  return block.name !== null && block.name.trim() !== ""
    ? block.name.trim()
    : `Bloc ${index + 1}`;
}

// "Classique · Force"
function fullBlockLabel(
  block: Pick<DraftBlock, "block_type" | "name">,
  index: number,
): string {
  return `${BLOCK_TYPE_LABELS[block.block_type]} · ${blockTitle(block, index)}`;
}

// "Fentes · 3 séries · 10 rép."
function exerciseLine(exercise: DraftExercise): string {
  return `${exercise.name} · ${formatSetSummary(exercise)}`;
}

function sameSetValues(a: PlannedSetValues, b: PlannedSetValues): boolean {
  return (Object.keys(a) as (keyof PlannedSetValues)[]).every(
    (field) => a[field] === b[field],
  );
}

function sameSets(a: PlannedSetValues[], b: PlannedSetValues[]): boolean {
  return (
    a.length === b.length &&
    a.every((set, index) => {
      const other = b[index];
      return other !== undefined && sameSetValues(set, other);
    })
  );
}

// "1 min 30", or "aucun" when no rest is planned.
function restLabel(seconds: number | null): string {
  return seconds === null ? "aucun" : formatDuration(seconds);
}

// What changed in one exercise kept in its block.
function diffExercise(
  before: DraftExercise,
  after: DraftExercise,
): SessionChange[] {
  const changes: SessionChange[] = [];
  if (!sameSets(before.sets, after.sets)) {
    const left = formatSetSummary(before);
    const right = formatSetSummary(after);
    changes.push({
      kind: "changed",
      // Same summary on both sides: the values differ set by set.
      text:
        left === right
          ? `${after.name} : séries modifiées`
          : `${after.name} : ${left} → ${right}`,
    });
  }
  if (before.default_rest_seconds !== after.default_rest_seconds) {
    changes.push({
      kind: "changed",
      text: `${after.name} : repos ${restLabel(before.default_rest_seconds)} → ${restLabel(after.default_rest_seconds)}`,
    });
  }
  return changes;
}

// What changed in one block kept in the session.
function diffBlock(
  before: DraftBlock,
  after: DraftBlock,
  index: number,
): SessionChange[] {
  const changes: SessionChange[] = [];
  const title = blockTitle(after, index);

  if (before.block_type !== after.block_type) {
    changes.push({
      kind: "changed",
      text: `${title} : ${BLOCK_TYPE_LABELS[before.block_type]} → ${BLOCK_TYPE_LABELS[after.block_type]}`,
    });
  }
  if (blockTitle(before, index) !== title) {
    changes.push({
      kind: "changed",
      text: `Bloc ${index + 1} : « ${blockTitle(before, index)} » → « ${title} »`,
    });
  }
  if ((before.instructions ?? "") !== (after.instructions ?? "")) {
    changes.push({ kind: "changed", text: `${title} : consignes modifiées` });
  }

  const beforeExercises = new Map(
    before.exercises.map((exercise) => [exercise.key, exercise]),
  );
  for (const exercise of after.exercises) {
    const old = beforeExercises.get(exercise.key);
    if (old === undefined) {
      changes.push({ kind: "added", text: exerciseLine(exercise) });
    } else {
      changes.push(...diffExercise(old, exercise));
    }
  }
  const afterKeys = new Set(after.exercises.map((exercise) => exercise.key));
  for (const exercise of before.exercises) {
    if (!afterKeys.has(exercise.key)) {
      changes.push({ kind: "removed", text: exerciseLine(exercise) });
    }
  }
  return changes;
}

// The readable list of changes between the saved session and the edited one
// (CAL-06b). Blocks and exercises are matched by their draft key, which the
// editor keeps from one end to the other.
export function diffSessionDrafts(
  before: SessionDraft,
  after: SessionDraft,
): SessionChange[] {
  const changes: SessionChange[] = [];

  if (before.name !== after.name) {
    changes.push({
      kind: "changed",
      text: `Nom : « ${before.name} » → « ${after.name} »`,
    });
  }

  const beforeBlocks = new Map(
    before.blocks.map((block) => [block.key, block]),
  );
  after.blocks.forEach((block, index) => {
    const old = beforeBlocks.get(block.key);
    if (old === undefined) {
      changes.push({ kind: "added", text: fullBlockLabel(block, index) });
      for (const exercise of block.exercises) {
        changes.push({ kind: "added", text: exerciseLine(exercise) });
      }
    } else {
      changes.push(...diffBlock(old, block, index));
    }
  });

  const afterKeys = new Set(after.blocks.map((block) => block.key));
  before.blocks.forEach((block, index) => {
    if (!afterKeys.has(block.key)) {
      changes.push({ kind: "removed", text: fullBlockLabel(block, index) });
      for (const exercise of block.exercises) {
        changes.push({ kind: "removed", text: exerciseLine(exercise) });
      }
    }
  });

  return changes;
}

// "3 changements", "1 changement".
export function formatChangeCount(count: number): string {
  return `${count} ${count > 1 ? "changements" : "changement"}`;
}
