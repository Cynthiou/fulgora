import { type FormEvent, useState } from "react";
import {
  describeDayAfterAdding,
  getWeekdayLabel,
  type ProgramSessionSummary,
} from "shared";
import plusIcon from "../../../assets/icons/ui/app/plus.svg";
import BottomSheet from "../../../components/BottomSheet";
import Icon from "../../../components/Icon";
import TextField from "../../../components/TextField";

type Props = {
  weekday: number;
  // The sessions already planned, to say what the day will hold
  sessions: ProgramSessionSummary[];
  // What the new session adds to the Planning, once the program is created
  addedLine: string | null;
  isSending: boolean;
  error: string | null;
  onConfirm: (name: string, plannedTime: string | null) => void;
  onClose: () => void;
};

// Screen PRO-03a: "+ Autre séance le lundi". The name is required, the
// hour is not; the panel says what the day will hold and how many
// appointments this adds (US-19).
function AddSessionOnDaySheet({
  weekday,
  sessions,
  addedLine,
  isSending,
  error,
  onConfirm,
  onClose,
}: Props) {
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const dayLine = describeDayAfterAdding(sessions, weekday);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() === "") {
      setNameError("Donne un nom à cette séance.");
      return;
    }
    onConfirm(name.trim(), time === "" ? null : time);
  }

  return (
    <BottomSheet
      label={`Autre séance le ${getWeekdayLabel(weekday).toLocaleLowerCase("fr-FR")}`}
      onClose={onClose}
      closeLabel={null}
    >
      <h2 className="text-[26px] leading-none">
        Autre séance le {getWeekdayLabel(weekday).toLocaleLowerCase("fr-FR")}
      </h2>
      {dayLine !== null && (
        <p className="text-[13px] leading-[1.45] text-muted">{dayLine}</p>
      )}

      <form noValidate onSubmit={submit} className="flex flex-col gap-3">
        <TextField
          id="program-session-name"
          label="Nom de la séance"
          required
          value={name}
          onChange={(event) => {
            setNameError(null);
            setName(event.target.value);
          }}
          placeholder="Ex. Gainage"
          autoComplete="off"
          maxLength={160}
          error={nameError ?? undefined}
        />
        <TextField
          id="program-session-time"
          label="Heure (facultatif)"
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />

        {addedLine !== null && (
          <p className="text-xs leading-[1.45] text-muted">{addedLine}</p>
        )}
        {error !== null && (
          <p role="alert" className="text-sm font-semibold">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSending}
          className="flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60"
        >
          <Icon src={plusIcon} className="size-[18px]" />
          {isSending ? "Ajout…" : "Ajouter la séance"}
        </button>
      </form>
    </BottomSheet>
  );
}

export default AddSessionOnDaySheet;
